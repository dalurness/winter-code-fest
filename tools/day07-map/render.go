package main

import (
	"runtime"
	"sync"

	"wcf/day07-map/mapgen"
)

type rgb struct{ r, g, b uint8 }

// palette[h+8] is the colour for height h. Air (<= 0) runs from deep teal
// valleys to pale meadow; mountains (>= 1) run from brown foothills through
// grey rock to snow.
var palette = [17]rgb{
	{14, 42, 71}, {18, 56, 86}, {22, 72, 98}, {28, 90, 104}, {36, 108, 104},
	{52, 126, 98}, {76, 146, 92}, {108, 166, 96}, {150, 188, 112},
	{150, 112, 70}, {132, 96, 60}, {116, 84, 56}, {108, 92, 80},
	{128, 122, 116}, {160, 158, 156}, {200, 200, 204}, {244, 246, 250},
}

// darkAir replaces the air half of the palette for the dark style: deep
// valleys are near black and air at height 0 is a dark grey, so the
// coloured mountains stand out.
var darkAir = [9]rgb{
	{8, 8, 10}, {13, 13, 15}, {18, 18, 21}, {23, 23, 27}, {29, 29, 33},
	{35, 35, 40}, {42, 42, 47}, {49, 49, 55}, {57, 57, 63},
}

var (
	colStart    = rgb{255, 60, 60}
	colGoal     = rgb{255, 40, 255}
	colCorridor = rgb{80, 230, 255}
)

func heightColor(h int) rgb { return palette[h-mapgen.MinHeight] }

// Palettes for drawing tiles.
const (
	palColor = iota // full colour: teal and green air, brown to snow mountains
	palDark         // dark grey air, coloured mountains
	palGray         // dark grey air, light grey mountains, no middle greys
	palMono         // black air, white mountains
)

var paletteNames = []string{"color", "dark", "gray", "mono"}

func parsePalette(s string) (int, bool) {
	for i, n := range paletteNames {
		if n == s {
			return i, true
		}
	}
	return 0, false
}

// tileColor is the colour of height h in palette pal.
func tileColor(h, pal int) rgb {
	switch {
	case pal == palMono && h <= 0:
		return rgb{0, 0, 0}
	case pal == palMono:
		return rgb{255, 255, 255}
	case pal == palDark && h <= 0:
		return darkAir[h-mapgen.MinHeight]
	case pal == palGray && h <= 0:
		// -8..0 -> 12..72: deeper is darker.
		v := uint8(72 - 60*(-h)/8)
		return rgb{v, v, v}
	case pal == palGray:
		// 1..8 -> 170..245: higher is lighter.
		v := uint8(170 + 75*(h-1)/7)
		return rgb{v, v, v}
	}
	return heightColor(h)
}

// oxText is the colour of an O/X character for a tile coloured c, drawn on
// the terminal's own background. Very dark colours are lifted so the
// character stays visible on a dark terminal.
func oxText(c rgb) rgb {
	const floor = 64
	lift := func(v uint8) uint8 { return max(v, floor) }
	return rgb{lift(c.r), lift(c.g), lift(c.b)}
}

// textOn picks black or white text for legibility on background c.
func textOn(c rgb) rgb {
	if 299*int(c.r)+587*int(c.g)+114*int(c.b) > 128*1000 {
		return rgb{0, 0, 0}
	}
	return rgb{255, 255, 255}
}

// ASCII ramps used by the plain renderers.
func shadeChar(h int) byte {
	switch {
	case h <= -3:
		return ' '
	case h <= -1:
		return '.'
	case h == 0:
		return ','
	case h <= 2:
		return '+'
	case h <= 5:
		return '#'
	default:
		return '@'
	}
}

func oxChar(h int) byte {
	if h <= 0 {
		return 'O'
	}
	return 'X'
}

// cellHeight summarises the zoom x zoom block of tiles whose top-left corner
// is (x0, y0). Blocks bigger than 4x4 are subsampled on a 4x4 grid. The block
// counts as mountain when most samples are mountain, and its height is the
// mean height of the winning kind, so a zoomed-out view keeps the same
// passable/mountain split as the tiles it covers.
func cellHeight(seed uint64, x0, y0, zoom int64) int {
	if zoom == 1 {
		return mapgen.Height(seed, x0, y0)
	}
	k := zoom
	if k > 4 {
		k = 4
	}
	step := zoom / k
	off := step / 2
	var airN, airSum, mtnN, mtnSum int
	for j := int64(0); j < k; j++ {
		for i := int64(0); i < k; i++ {
			h := mapgen.Height(seed, x0+i*step+off, y0+j*step+off)
			if h <= 0 {
				airN++
				airSum += h
			} else {
				mtnN++
				mtnSum += h
			}
		}
	}
	if mtnN > airN {
		return roundDiv(mtnSum, mtnN)
	}
	return roundDiv(airSum, airN)
}

func roundDiv(a, b int) int {
	if a >= 0 {
		return (a + b/2) / b
	}
	return -((-a + b/2) / b)
}

// view is a window onto the map: w x h pixels, each covering zoom x zoom
// tiles, with tile (x0, y0) at the top-left.
type view struct {
	seed   uint64
	x0, y0 int64
	zoom   int64
	w, h   int
}

// heights computes every pixel of the view, a row at a time across all CPUs.
func (v view) heights() [][]int {
	out := make([][]int, v.h)
	rows := make(chan int)
	var wg sync.WaitGroup
	for n := 0; n < runtime.NumCPU(); n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range rows {
				row := make([]int, v.w)
				y := v.y0 + int64(j)*v.zoom
				for i := range row {
					row[i] = cellHeight(v.seed, v.x0+int64(i)*v.zoom, y, v.zoom)
				}
				out[j] = row
			}
		}()
	}
	for j := 0; j < v.h; j++ {
		rows <- j
	}
	close(rows)
	wg.Wait()
	return out
}

// pixel returns the pixel holding tile (x, y), and whether it is in view.
func (v view) pixel(x, y int64) (int, int, bool) {
	dx, dy := x-v.x0, y-v.y0
	if dx < 0 || dy < 0 {
		return 0, 0, false
	}
	i, j := dx/v.zoom, dy/v.zoom
	if i >= int64(v.w) || j >= int64(v.h) {
		return 0, 0, false
	}
	return int(i), int(j), true
}

// overlay marks the start and the goal.
type overlay struct {
	seed      uint64
	sx, sy    int64
	gx, gy    int64
	corridors bool // tint corridor tiles
}

func newOverlay(seed uint64) overlay {
	sx, sy := mapgen.Start(seed)
	gx, gy := mapgen.Goal(seed)
	return overlay{seed: seed, sx: sx, sy: sy, gx: gx, gy: gy}
}

// mark is an overlay pixel: its colour and its ASCII character.
type mark struct {
	c  rgb
	ch byte
}

// marks returns a sparse map of pixel -> mark for the overlay.
func (o overlay) marks(v view) map[[2]int]mark {
	m := map[[2]int]mark{}
	if o.corridors {
		o.corridorMarks(v, m)
	}
	if i, j, ok := v.pixel(o.gx, o.gy); ok {
		m[[2]int{i, j}] = mark{colGoal, 'E'}
	}
	if i, j, ok := v.pixel(o.sx, o.sy); ok {
		m[[2]int{i, j}] = mark{colStart, 'S'}
	}
	return m
}

// corridorMarks tints pixels that contain a corridor tile. At zoom 1 it
// tests every tile. Zoomed out, sampled tiles could miss a corridor 3-5
// tiles wide, so it walks each corridor's centre line instead.
func (o overlay) corridorMarks(v view, m map[[2]int]mark) {
	if v.zoom == 1 {
		for j := 0; j < v.h; j++ {
			for i := 0; i < v.w; i++ {
				if mapgen.OnCorridor(o.seed, v.x0+int64(i), v.y0+int64(j)) {
					m[[2]int{i, j}] = mark{colCorridor, '='}
				}
			}
		}
		return
	}
	// Zoomed out: sample each corridor's centre line.
	mapgen.EachCorridorLine(o.seed, v.x0, v.y0, v.x0+int64(v.w)*v.zoom, v.y0+int64(v.h)*v.zoom, float64(v.zoom)/2,
		func(x, y int64) {
			if i, j, ok := v.pixel(x, y); ok {
				m[[2]int{i, j}] = mark{colCorridor, '='}
			}
		})
}
