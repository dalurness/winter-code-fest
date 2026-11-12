// Command day07-map explores the procedurally generated map for the advanced
// Buddy Pathfinder challenge.
//
//	day07-map [view] [flags]   interactive terminal viewer (default)
//	day07-map dump [flags]     print one frame to stdout and exit
//	day07-map png -o FILE      render a frame to a PNG image
//	day07-map scan [flags]     brute-force the goal region for goal tiles
//	day07-map stats [flags]    passable fraction and Height() speed
package main

import (
	"bufio"
	"flag"
	"fmt"
	"hash/fnv"
	"image"
	"image/png"
	"os"
	"strconv"
	"time"

	"wcf/day07-map/mapgen"
)

// parseSeed accepts a decimal or 0x-prefixed uint64, or any other string,
// which is hashed to a uint64.
func parseSeed(s string) uint64 {
	if v, err := strconv.ParseUint(s, 0, 64); err == nil {
		return v
	}
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

type common struct {
	seedStr string
	seed    uint64
	x, y    int64
	zoom    int64
	set     map[string]bool
}

func addCommon(fs *flag.FlagSet, c *common) {
	fs.StringVar(&c.seedStr, "seed", "north-pole", "map seed: a number or any string")
	fs.Int64Var(&c.x, "x", 0, "centre x (default: the start tile)")
	fs.Int64Var(&c.y, "y", 0, "centre y (default: the start tile)")
	fs.Int64Var(&c.zoom, "zoom", 1, "tiles per pixel (rounded down to a power of two)")
}

func (c *common) finish(fs *flag.FlagSet) {
	c.seed = parseSeed(c.seedStr)
	c.set = map[string]bool{}
	fs.Visit(func(f *flag.Flag) { c.set[f.Name] = true })
	if !c.set["x"] && !c.set["y"] {
		c.x, c.y = mapgen.Start(c.seed)
	}
	c.zoom = pow2(c.zoom)
}

func pow2(z int64) int64 {
	p := int64(1)
	for p*2 <= z && p < 1<<20 {
		p *= 2
	}
	return p
}

func main() {
	cmd, args := "view", os.Args[1:]
	if len(args) > 0 && args[0] != "" && args[0][0] != '-' {
		cmd, args = args[0], args[1:]
	}
	switch cmd {
	case "view":
		runView(args)
	case "dump":
		runDump(args)
	case "png":
		runPNG(args)
	case "scan":
		runScan(args)
	case "stats":
		runStats(args)
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q (want view, dump, png, scan or stats)\n", cmd)
		os.Exit(2)
	}
}

func runDump(args []string) {
	fs := flag.NewFlagSet("dump", flag.ExitOnError)
	var c common
	addCommon(fs, &c)
	w := fs.Int("w", 100, "width in characters")
	h := fs.Int("h", 40, "height in characters")
	style := fs.String("style", "shade", "shade (ASCII ramp), ox (O/X like the original day 7) or color (ANSI half blocks)")
	fs.Parse(args)
	c.finish(fs)

	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	ov := newOverlay(c.seed)
	ov.goals = mapgen.Scan(c.seed)
	if *style == "color" {
		v := centred(c, *w, *h*2)
		out.WriteString(halfBlocks(v, v.heights(), ov.marks(v), false))
		return
	}
	v := centred(c, *w, *h)
	hs := v.heights()
	marks := ov.marks(v)
	for j, row := range hs {
		for i, ht := range row {
			ch := shadeChar(ht)
			if *style == "ox" {
				ch = oxChar(ht)
			}
			if m, ok := marks[[2]int{i, j}]; ok {
				ch = m.ch
			}
			out.WriteByte(ch)
		}
		out.WriteByte('\n')
	}
	fmt.Fprintf(out, "seed=%s (%d) centre=(%d,%d) zoom=1:%d\n", c.seedStr, c.seed, c.x, c.y, c.zoom)
}

func centred(c common, w, h int) view {
	return view{
		seed: c.seed, zoom: c.zoom, w: w, h: h,
		x0: c.x - int64(w/2)*c.zoom,
		y0: c.y - int64(h/2)*c.zoom,
	}
}

func runPNG(args []string) {
	fs := flag.NewFlagSet("png", flag.ExitOnError)
	var c common
	addCommon(fs, &c)
	w := fs.Int("w", 800, "width in pixels")
	h := fs.Int("h", 500, "height in pixels")
	scale := fs.Int("scale", 1, "draw each map pixel as scale x scale image pixels")
	o := fs.String("o", "map.png", "output file")
	fs.Parse(args)
	c.finish(fs)

	v := centred(c, *w, *h)
	hs := v.heights()
	ov := newOverlay(c.seed)
	ov.goals = mapgen.Scan(c.seed)
	marks := ov.marks(v)
	s := *scale
	img := image.NewRGBA(image.Rect(0, 0, *w*s, *h*s))
	for j, row := range hs {
		for i, ht := range row {
			col := heightColor(ht)
			if m, ok := marks[[2]int{i, j}]; ok {
				col = m.c
			}
			for dy := 0; dy < s; dy++ {
				for dx := 0; dx < s; dx++ {
					o := img.PixOffset(i*s+dx, j*s+dy)
					img.Pix[o], img.Pix[o+1], img.Pix[o+2], img.Pix[o+3] = col.r, col.g, col.b, 255
				}
			}
		}
	}
	// Ring the start and goal so they are visible at any zoom.
	for at, m := range marks {
		if m.ch != 'S' && m.ch != 'E' {
			continue
		}
		cx, cy := at[0]*s+s/2, at[1]*s+s/2
		for dy := -8; dy <= 8; dy++ {
			for dx := -8; dx <= 8; dx++ {
				d := dx*dx + dy*dy
				if d < 25 || d > 64 || !image.Pt(cx+dx, cy+dy).In(img.Rect) {
					continue
				}
				o := img.PixOffset(cx+dx, cy+dy)
				img.Pix[o], img.Pix[o+1], img.Pix[o+2] = m.c.r, m.c.g, m.c.b
			}
		}
	}
	f, err := os.Create(*o)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("wrote %s: seed=%s centre=(%d,%d) zoom=1:%d\n", *o, c.seedStr, c.x, c.y, c.zoom)
}

func runScan(args []string) {
	fs := flag.NewFlagSet("scan", flag.ExitOnError)
	seedStr := fs.String("seed", "north-pole", "map seed")
	find := fs.Int("find", 0, "instead, try this many numeric seeds from -seed upward and list those with exactly one goal")
	fs.Parse(args)
	if *find > 0 {
		base := parseSeed(*seedStr)
		for i := 0; i < *find; i++ {
			s := base + uint64(i)
			if g := mapgen.Scan(s); len(g) == 1 {
				fmt.Printf("seed %d: goal at (%d,%d)\n", s, g[0][0], g[0][1])
			}
		}
		return
	}
	seed := parseSeed(*seedStr)
	sx, sy := mapgen.Start(seed)
	r := mapgen.GoalRegion(seed)
	t := time.Now()
	goals := mapgen.Scan(seed)
	fmt.Printf("seed:        %s (%d)\n", *seedStr, seed)
	fmt.Printf("start:       (%d,%d) %s\n", sx, sy, openness(seed, sx, sy))
	fmt.Printf("goal region: x %d..%d, y %d..%d (%dx%d)\n", r.X0, r.X1-1, r.Y0, r.Y1-1, r.X1-r.X0, r.Y1-r.Y0)
	fmt.Printf("scanned in:  %v\n", time.Since(t).Round(time.Millisecond))
	fmt.Printf("goal tiles:  %d\n", len(goals))
	for _, g := range goals {
		fmt.Printf("  (%d,%d) height %d %s\n", g[0], g[1], mapgen.Height(seed, g[0], g[1]), openness(seed, g[0], g[1]))
	}
}

// escapeRadius is how far openness floods before calling a tile open.
const escapeRadius = 1024

// openness flood-fills (4-directionally) from a tile within a square of
// radius escapeRadius. Reaching the square's edge means the tile is not in a
// small sealed pocket. It does not prove that start and goal are connected:
// only a real solver can show that.
func openness(seed uint64, x, y int64) string {
	const n = 2*escapeRadius + 1
	seen := make([]bool, n*n)
	idx := func(dx, dy int64) int { return int(dy+escapeRadius)*n + int(dx+escapeRadius) }
	stack := [][2]int64{{0, 0}}
	seen[idx(0, 0)] = true
	count := 0
	for len(stack) > 0 {
		c := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		count++
		for _, d := range [4][2]int64{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
			a, b := c[0]+d[0], c[1]+d[1]
			if a < -escapeRadius || a > escapeRadius || b < -escapeRadius || b > escapeRadius {
				return fmt.Sprintf("(open: escapes a %d-tile radius)", escapeRadius)
			}
			if seen[idx(a, b)] || !mapgen.Passable(seed, x+a, y+b) {
				continue
			}
			seen[idx(a, b)] = true
			stack = append(stack, [2]int64{a, b})
		}
	}
	return fmt.Sprintf("(SEALED: pocket of %d tiles)", count)
}

func runStats(args []string) {
	fs := flag.NewFlagSet("stats", flag.ExitOnError)
	seedStr := fs.String("seed", "north-pole", "map seed")
	n := fs.Int("n", 2000000, "number of tiles to sample")
	fs.Parse(args)
	seed := parseSeed(*seedStr)
	var hist [17]int
	// Sample a coarse grid spread over a 16M x 16M area so provinces of every
	// kind are represented.
	side := 1
	for side*side < *n {
		side++
	}
	t := time.Now()
	for j := 0; j < side; j++ {
		for i := 0; i < side; i++ {
			x := int64(i)*7919 - 8_000_000
			y := int64(j)*7907 - 8_000_000
			hist[mapgen.Height(seed, x, y)-mapgen.MinHeight]++
		}
	}
	el := time.Since(t)
	total := side * side
	air := 0
	for h := mapgen.MinHeight; h <= 0; h++ {
		air += hist[h-mapgen.MinHeight]
	}
	fmt.Printf("seed %s: %d samples, %.1f%% passable, %.0f ns per Height()\n",
		*seedStr, total, 100*float64(air)/float64(total), float64(el.Nanoseconds())/float64(total))
	for h := mapgen.MinHeight; h <= mapgen.MaxHeight; h++ {
		fmt.Printf("  %3d %6.2f%%\n", h, 100*float64(hist[h-mapgen.MinHeight])/float64(total))
	}
}
