package main

import (
	"fmt"
	"regexp"
	"strings"
	"testing"
)

func TestHeightsReusing(t *testing.T) {
	const seed = 42
	for _, zoom := range []int64{1, 2, 8} {
		prev := view{seed: seed, x0: 4600, y0: 2190, zoom: zoom, w: 30, h: 20}
		prevHs := prev.heights()
		for _, d := range [][2]int64{{4, 0}, {-4, 0}, {0, 4}, {0, -4}, {7, -3}, {29, 19}, {-30, 0}, {100, 100}} {
			v := prev
			v.x0 += d[0] * zoom
			v.y0 += d[1] * zoom
			got, want := v.heightsReusing(prev, prevHs), v.heights()
			if fmt.Sprint(got) != fmt.Sprint(want) {
				t.Errorf("zoom %d, pan %v: reused heights differ from computed ones", zoom, d)
			}
		}
		// A different size and an offset that isn't a whole pixel
		v := prev
		v.w, v.h, v.x0 = 34, 17, prev.x0+zoom/2+1
		if fmt.Sprint(v.heightsReusing(prev, prevHs)) != fmt.Sprint(v.heights()) {
			t.Errorf("zoom %d: resized, unaligned view differs", zoom)
		}
	}
}

// cell is what a terminal shows in one cell
type cell struct {
	fg, bg string
	ch     rune
}

var sgrRe = regexp.MustCompile(`^\x1b\[([0-9;]*)m`)

// screen decodes a frame's SGR colours and characters into cells, row by
// row, as a terminal would.
func screen(frame string) [][]cell {
	var rows [][]cell
	var row []cell
	fg, bg := "default", "default"
	for len(frame) > 0 {
		if m := sgrRe.FindStringSubmatch(frame); m != nil {
			p := strings.Split(m[1], ";")
			for i := 0; i < len(p); i++ {
				switch p[i] {
				case "0", "":
					fg, bg = "default", "default"
				case "38", "48":
					c := strings.Join(p[i+2:i+5], ",")
					if p[i] == "38" {
						fg = c
					} else {
						bg = c
					}
					i += 4
				}
			}
			frame = frame[len(m[0]):]
			continue
		}
		if strings.HasPrefix(frame, "\r\n") {
			rows = append(rows, row)
			row = nil
			frame = frame[2:]
			continue
		}
		r := []rune(frame)[0]
		row = append(row, cell{fg, bg, r})
		frame = frame[len(string(r)):]
	}
	return append(rows, row)
}

// The formats the viewer used before sending colours only on change
func oldHalfBlocks(v view, hs [][]int, marks map[[2]int]mark, cross bool, pal int) string {
	var b strings.Builder
	col := func(i, j int) rgb {
		if m, ok := marks[[2]int{i, j}]; ok {
			return m.c
		}
		return tileColor(hs[j][i], pal)
	}
	cx, cy := v.w/2, v.h/2
	for j := 0; j+1 < v.h; j += 2 {
		for i := 0; i < v.w; i++ {
			t, u := col(i, j), col(i, j+1)
			if cross && i == cx && (j == cy || j+1 == cy) {
				bg := u
				if j+1 == cy {
					bg = t
				}
				fg := textOn(bg)
				fmt.Fprintf(&b, "\x1b[38;2;%d;%d;%d;48;2;%d;%d;%dm+", fg.r, fg.g, fg.b, bg.r, bg.g, bg.b)
				continue
			}
			fmt.Fprintf(&b, "\x1b[38;2;%d;%d;%d;48;2;%d;%d;%dm▀", t.r, t.g, t.b, u.r, u.g, u.b)
		}
		b.WriteString("\x1b[0m\r\n")
	}
	return b.String()
}

func oldOxFrame(v view, hs [][]int, marks map[[2]int]mark, pal int) string {
	var b strings.Builder
	for j, row := range hs {
		for i, ht := range row {
			ch, c := oxChar(ht), oxText(tileColor(ht, pal))
			if m, ok := marks[[2]int{i, j}]; ok {
				ch, c = m.ch, m.c
			}
			if i == v.w/2 && j == v.h/2 {
				ch, c = '+', rgb{255, 220, 0}
			}
			fmt.Fprintf(&b, "\x1b[38;2;%d;%d;%dm%c", c.r, c.g, c.b, ch)
		}
		b.WriteString("\x1b[0m\r\n")
	}
	return b.String()
}

func TestFramesMatchOldFormat(t *testing.T) {
	const seed = 7
	ov := newOverlay(seed)
	ov.corridors = true
	v := view{seed: seed, x0: ov.sx - 40, y0: ov.sy - 21, zoom: 1, w: 80, h: 42}
	hs := v.heights()
	marks := ov.marks(v)
	for pal := range paletteNames {
		oldB, newB := oldHalfBlocks(v, hs, marks, true, pal), halfBlocks(v, hs, marks, true, pal)
		if fmt.Sprint(screen(oldB)) != fmt.Sprint(screen(newB)) {
			t.Errorf("palette %d: half blocks draw differently", pal)
		}
		oldO, newO := oldOxFrame(v, hs, marks, pal), oxFrame(v, hs, marks, pal)
		if fmt.Sprint(screen(oldO)) != fmt.Sprint(screen(newO)) {
			t.Errorf("palette %d: O/X draws differently", pal)
		}
		if pal == 0 {
			t.Logf("half blocks %d -> %d bytes, O/X %d -> %d bytes", len(oldB), len(newB), len(oldO), len(newO))
		}
	}
}

func BenchmarkPan(b *testing.B) {
	const seed = 7
	v := view{seed: seed, x0: 4600, y0: 2190, zoom: 1, w: 80, h: 82}
	b.Run("full", func(b *testing.B) {
		for range b.N {
			v.heights()
		}
	})
	b.Run("reused", func(b *testing.B) {
		prev, prevHs := v, v.heights()
		next := v
		next.x0 += 4
		for range b.N {
			next.heightsReusing(prev, prevHs)
		}
	})
	hs := v.heights()
	marks := map[[2]int]mark{}
	b.Run("oldFrame", func(b *testing.B) {
		for range b.N {
			oldHalfBlocks(v, hs, marks, true, 0)
		}
	})
	b.Run("newFrame", func(b *testing.B) {
		for range b.N {
			halfBlocks(v, hs, marks, true, 0)
		}
	})
}
