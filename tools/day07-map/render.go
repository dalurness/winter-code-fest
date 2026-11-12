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

var (
	colStart  = rgb{255, 60, 60}
	colGoal   = rgb{255, 40, 255}
	colRegion = rgb{255, 220, 60}
)

func heightColor(h int) rgb { return palette[h-mapgen.MinHeight] }

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

// overlay marks the start, the goal region outline and any known goal tiles.
type overlay struct {
	sx, sy int64
	region mapgen.Rect
	goals  [][2]int64
}

func newOverlay(seed uint64) overlay {
	sx, sy := mapgen.Start(seed)
	return overlay{sx: sx, sy: sy, region: mapgen.GoalRegion(seed)}
}

// marks returns a sparse map of pixel -> colour/char for the overlay.
type mark struct {
	c  rgb
	ch byte
}

func (o overlay) marks(v view) map[[2]int]mark {
	m := map[[2]int]mark{}
	// Region outline: walk the edges of the rect at pixel resolution.
	r := o.region
	edge := func(x, y int64) {
		if i, j, ok := v.pixel(x, y); ok {
			m[[2]int{i, j}] = mark{colRegion, '*'}
		}
	}
	step := v.zoom
	clamp := func(a, lo, hi int64) int64 { return max(lo, min(a, hi)) }
	// only walk the visible part of each edge
	vx1, vy1 := v.x0+int64(v.w)*v.zoom, v.y0+int64(v.h)*v.zoom
	for x := clamp(v.x0, r.X0, r.X1-1); x <= clamp(vx1, r.X0, r.X1-1); x += step {
		edge(x, r.Y0)
		edge(x, r.Y1-1)
	}
	for y := clamp(v.y0, r.Y0, r.Y1-1); y <= clamp(vy1, r.Y0, r.Y1-1); y += step {
		edge(r.X0, y)
		edge(r.X1-1, y)
	}
	for _, g := range o.goals {
		if i, j, ok := v.pixel(g[0], g[1]); ok {
			m[[2]int{i, j}] = mark{colGoal, 'E'}
		}
	}
	if i, j, ok := v.pixel(o.sx, o.sy); ok {
		m[[2]int{i, j}] = mark{colStart, 'S'}
	}
	return m
}
