package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/term"

	"wcf/day07-map/mapgen"
)

// halfBlocks renders a view whose height is two pixels per text row using
// "▀" with a truecolor foreground (top pixel) and background (bottom pixel),
// in palette pal. With cross set, the centre pixel is drawn as a crosshair.
func halfBlocks(v view, hs [][]int, marks map[[2]int]mark, cross bool, pal int) string {
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
				// Keep the other pixel's colour as the background.
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

// oxFrame renders one O (air) or X (mountain) per pixel, on a background
// coloured by palette pal.
func oxFrame(v view, hs [][]int, marks map[[2]int]mark, pal int) string {
	var b strings.Builder
	for j, row := range hs {
		for i, ht := range row {
			ch, bg := oxChar(ht), tileColor(ht, pal)
			if m, ok := marks[[2]int{i, j}]; ok {
				ch, bg = m.ch, m.c
			}
			if i == v.w/2 && j == v.h/2 {
				ch = '+'
			}
			fg := textOn(bg)
			fmt.Fprintf(&b, "\x1b[38;2;%d;%d;%d;48;2;%d;%d;%dm%c", fg.r, fg.g, fg.b, bg.r, bg.g, bg.b, ch)
		}
		b.WriteString("\x1b[0m\r\n")
	}
	return b.String()
}

type viewer struct {
	seedStr string
	seed    uint64
	x, y    int64 // centre tile
	zoom    int64
	fast    bool
	ox      bool // O/X characters instead of half blocks
	pal     int
	help    bool
	ov      overlay
}

func runView(args []string) {
	fs := flag.NewFlagSet("view", flag.ExitOnError)
	var c common
	addCommon(fs, &c)
	fs.Parse(args)
	c.finish(fs)

	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		fmt.Fprintln(os.Stderr, "view needs a terminal; use `dump` or `png` for non-interactive output")
		os.Exit(1)
	}
	old, err := term.MakeRaw(fd)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	restore := func() {
		os.Stdout.WriteString("\x1b[0m\x1b[?25h\x1b[?1049l")
		term.Restore(fd, old)
	}
	defer restore()
	os.Stdout.WriteString("\x1b[?1049h\x1b[?25l")

	v := &viewer{seedStr: c.seedStr, seed: c.seed, x: c.x, y: c.y, zoom: c.zoom, ov: c.overlay()}
	v.pal = c.pal

	keys := make(chan string, 64)
	go readKeys(keys)
	winch := make(chan os.Signal, 1)
	signal.Notify(winch, syscall.SIGWINCH)

	v.draw()
	for {
		select {
		case k := <-keys:
			if !v.key(k) {
				return
			}
			// Coalesce keys that piled up while we were drawing.
			for drained := false; !drained; {
				select {
				case k := <-keys:
					if !v.key(k) {
						return
					}
				default:
					drained = true
				}
			}
		case <-winch:
		}
		v.draw()
	}
}

// readKeys turns raw stdin bytes into key names.
func readKeys(out chan<- string) {
	buf := make([]byte, 64)
	for {
		n, err := os.Stdin.Read(buf)
		if err != nil {
			close(out)
			return
		}
		s := string(buf[:n])
		for len(s) > 0 {
			k, rest := nextKey(s)
			out <- k
			s = rest
		}
	}
}

var escKeys = map[string]string{
	"\x1b[A": "up", "\x1b[B": "down", "\x1b[C": "right", "\x1b[D": "left",
	"\x1bOA": "up", "\x1bOB": "down", "\x1bOC": "right", "\x1bOD": "left",
	"\x1b[1;2A": "UP", "\x1b[1;2B": "DOWN", "\x1b[1;2C": "RIGHT", "\x1b[1;2D": "LEFT",
}

func nextKey(s string) (string, string) {
	if s[0] == 0x1b {
		for seq, name := range escKeys {
			if strings.HasPrefix(s, seq) {
				return name, s[len(seq):]
			}
		}
		if len(s) == 1 {
			return "esc", ""
		}
		// Unknown sequence: drop the rest of this read.
		return "", ""
	}
	return s[:1], s[1:]
}

// key applies one key press and reports whether to keep running.
func (v *viewer) key(k string) bool {
	w, h := v.size()
	step := int64(4)
	if v.fast {
		step = int64(max(w, h) / 2)
	}
	big := int64(max(w, h) / 2)
	switch k {
	case "q", "Q", "\x03", "":
		return k == ""
	case "up", "w", "k":
		v.y -= step * v.zoom
	case "down", "s", "j":
		v.y += step * v.zoom
	case "left", "a", "h":
		v.x -= step * v.zoom
	case "right", "d", "l":
		v.x += step * v.zoom
	case "UP", "W", "K":
		v.y -= big * v.zoom
	case "DOWN", "S", "J":
		v.y += big * v.zoom
	case "LEFT", "A", "H":
		v.x -= big * v.zoom
	case "RIGHT", "D", "L":
		v.x += big * v.zoom
	case "f":
		v.fast = !v.fast
	case "+", "=", "z":
		if v.zoom > 1 {
			v.zoom /= 2
		}
	case "-", "_", "x":
		if v.zoom < 1<<20 {
			v.zoom *= 2
		}
	case "m":
		v.ox = !v.ox
	case "p":
		v.pal = (v.pal + 1) % len(paletteNames)
	case "0", "o":
		v.x, v.y = v.ov.sx, v.ov.sy
	case "g":
		v.x, v.y = v.ov.gx, v.ov.gy
	case "c":
		v.ov.corridors = !v.ov.corridors
	case "?":
		v.help = !v.help
	}
	return true
}

// size is the map area in pixels.
func (v *viewer) size() (int, int) {
	cols, rows, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		cols, rows = 80, 24
	}
	rows-- // status line
	if v.help {
		rows -= len(helpLines)
	}
	rows = max(rows, 1)
	if !v.ox {
		return cols, rows * 2
	}
	return cols, rows
}

var helpLines = []string{
	" arrows/WASD/hjkl pan   Shift+arrow or capital WASD/HJKL pan half a screen   f toggle fast pan",
	" +/z zoom in   -/x zoom out   m blocks/O-X   p palette   c corridors   o start   g goal   ? help   q quit",
}

func (v *viewer) draw() {
	w, h := v.size()
	vw := view{seed: v.seed, zoom: v.zoom, w: w, h: h,
		x0: v.x - int64(w/2)*v.zoom, y0: v.y - int64(h/2)*v.zoom}
	t := time.Now()
	hs := vw.heights()
	marks := v.ov.marks(vw)
	var frame string
	if v.ox {
		frame = oxFrame(vw, hs, marks, v.pal)
	} else {
		frame = halfBlocks(vw, hs, marks, true, v.pal)
	}
	el := time.Since(t)

	var b strings.Builder
	b.WriteString("\x1b[H")
	b.WriteString(frame)
	if v.help {
		for _, l := range helpLines {
			b.WriteString("\x1b[0;7m" + pad(l, w) + "\x1b[0m\r\n")
		}
	}
	ht := mapgen.Height(v.seed, v.x, v.y)
	kind := "air"
	if ht > 0 {
		kind = "mountain"
	}
	goal := fmt.Sprintf("goal (%d, %d)", v.ov.gx, v.ov.gy)
	mode := "blocks " + paletteNames[v.pal]
	if v.ox {
		mode = "O/X " + paletteNames[v.pal]
	}
	fast := ""
	if v.fast {
		fast = " FAST"
	}
	status := fmt.Sprintf(" seed %s | (%d, %d) h=%d %s | zoom 1:%d | %s%s | %s | %dms | ? help, q quit",
		v.seedStr, v.x, v.y, ht, kind, v.zoom, mode, fast, goal, el.Milliseconds())
	b.WriteString("\x1b[0;7m" + pad(status, w) + "\x1b[0m")
	os.Stdout.WriteString(b.String())
}

func pad(s string, w int) string {
	r := []rune(s)
	if len(r) >= w {
		return string(r[:w])
	}
	return s + strings.Repeat(" ", w-len(r))
}
