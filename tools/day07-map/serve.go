package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"wcf/day07-map/mapgen"
)

// maxChunkTiles caps one chunk request at 4096 x 4096 tiles.
const maxChunkTiles = 1 << 24

// writeChunk writes the heights of the w x h tiles whose top-left is (x, y).
//
//	ox       one line per row, O for passable and X for mountain
//	heights  one line per row, heights separated by spaces
//	raw      w*h bytes, row by row, each height as a signed byte
func writeChunk(out *bufio.Writer, seed uint64, x, y int64, w, h int, format string) {
	v := view{seed: seed, x0: x, y0: y, zoom: 1, w: w, h: h}
	for _, row := range v.heights() {
		switch format {
		case "raw":
			for _, ht := range row {
				out.WriteByte(byte(int8(ht)))
			}
		case "heights":
			for i, ht := range row {
				if i > 0 {
					out.WriteByte(' ')
				}
				out.WriteString(strconv.Itoa(ht))
			}
			out.WriteByte('\n')
		default:
			for _, ht := range row {
				out.WriteByte(oxChar(ht))
			}
			out.WriteByte('\n')
		}
	}
}

func checkFormat(f string) error {
	switch f {
	case "ox", "heights", "raw":
		return nil
	}
	return fmt.Errorf("unknown format %q (want ox, heights or raw)", f)
}

func checkSize(w, h int) error {
	if w <= 0 || h <= 0 || w*h > maxChunkTiles {
		return fmt.Errorf("chunk must be 1 to %d tiles, got %dx%d", maxChunkTiles, w, h)
	}
	return nil
}

// runChunk prints one chunk and exits.
func runChunk(args []string) {
	fs := flag.NewFlagSet("chunk", flag.ExitOnError)
	seedStr := fs.String("seed", "north-pole", "map seed")
	x := fs.Int64("x", 0, "left column")
	y := fs.Int64("y", 0, "top row")
	w := fs.Int("w", 256, "width in tiles")
	h := fs.Int("h", 256, "height in tiles")
	format := fs.String("format", "ox", "ox, heights or raw")
	fs.Parse(args)
	for _, err := range []error{checkFormat(*format), checkSize(*w, *h)} {
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
	}
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	writeChunk(out, parseSeed(*seedStr), *x, *y, *w, *h, *format)
}

// runServe answers requests, one per line on stdin, on stdout. Every reply
// starts with one header line: "ok" plus details, or "error <message>".
//
//	chunk X Y W H [FORMAT]  "ok W H FORMAT", then the chunk (see writeChunk)
//	tile X Y                "ok HEIGHT"
//	start                   "ok X Y"
//	goal                    "ok X Y"
//	seed                    "ok SEED"
//	quit                    exits (so does closing stdin)
func runServe(args []string) {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	seedStr := fs.String("seed", "north-pole", "map seed")
	format := fs.String("format", "ox", "default chunk format: ox, heights or raw")
	fs.Parse(args)
	if err := checkFormat(*format); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	serve(os.Stdin, os.Stdout, parseSeed(*seedStr), *format)
}

func serve(r io.Reader, w io.Writer, seed uint64, format string) {
	in := bufio.NewScanner(r)
	out := bufio.NewWriterSize(w, 1<<16)
	defer out.Flush()
	for in.Scan() {
		f := strings.Fields(in.Text())
		if len(f) == 0 {
			continue
		}
		if f[0] == "quit" {
			return
		}
		if err := handle(out, seed, format, f); err != nil {
			fmt.Fprintf(out, "error %v\n", err)
		}
		out.Flush()
	}
}

func handle(out *bufio.Writer, seed uint64, format string, f []string) error {
	ints := func(want int) ([]int64, error) {
		if len(f)-1 < want {
			return nil, fmt.Errorf("%s needs %d numbers", f[0], want)
		}
		n := make([]int64, want)
		for i := range n {
			v, err := strconv.ParseInt(f[i+1], 10, 64)
			if err != nil {
				return nil, fmt.Errorf("bad number %q", f[i+1])
			}
			n[i] = v
		}
		return n, nil
	}
	switch f[0] {
	case "chunk":
		n, err := ints(4)
		if err != nil {
			return err
		}
		if len(f) > 5 {
			format = f[5]
		}
		if err := checkFormat(format); err != nil {
			return err
		}
		// Bound W and H before converting them to int.
		if n[2] <= 0 || n[3] <= 0 || n[2] > maxChunkTiles || n[3] > maxChunkTiles {
			return checkSize(0, 0)
		}
		cw, ch := int(n[2]), int(n[3])
		if err := checkSize(cw, ch); err != nil {
			return err
		}
		fmt.Fprintf(out, "ok %d %d %s\n", cw, ch, format)
		writeChunk(out, seed, n[0], n[1], cw, ch, format)
	case "tile":
		n, err := ints(2)
		if err != nil {
			return err
		}
		fmt.Fprintf(out, "ok %d\n", mapgen.Height(seed, n[0], n[1]))
	case "start":
		x, y := mapgen.Start(seed)
		fmt.Fprintf(out, "ok %d %d\n", x, y)
	case "goal":
		x, y := mapgen.Goal(seed)
		fmt.Fprintf(out, "ok %d %d\n", x, y)
	case "seed":
		fmt.Fprintf(out, "ok %d\n", seed)
	default:
		return fmt.Errorf("unknown request %q (want chunk, tile, start, goal, seed or quit)", f[0])
	}
	return nil
}
