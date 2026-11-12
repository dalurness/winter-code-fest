package main

import (
	"bufio"
	"bytes"
	"strconv"
	"strings"
	"testing"

	"wcf/day07-map/mapgen"
)

func TestServe(t *testing.T) {
	const seed = 7
	var out bytes.Buffer
	in := "chunk -3 5 4 2\nchunk 10 -20 3 2 raw\nchunk 0 0 2 1 heights\ntile 1 2\nbogus\nchunk 0 0 0 5\nquit\ntile 0 0\n"
	serve(strings.NewReader(in), &out, seed, "ox")
	r := bufio.NewReader(&out)
	line := func() string {
		s, err := r.ReadString('\n')
		if err != nil {
			t.Fatalf("reply ended early: %v", err)
		}
		return strings.TrimSuffix(s, "\n")
	}
	ox := func(x, y int64) byte {
		if mapgen.Passable(seed, x, y) {
			return 'O'
		}
		return 'X'
	}
	if h := line(); h != "ok 4 2 ox" {
		t.Fatalf("header %q", h)
	}
	for j := int64(0); j < 2; j++ {
		row := line()
		for i := int64(0); i < 4; i++ {
			if row[i] != ox(-3+i, 5+j) {
				t.Fatalf("ox row %d = %q", j, row)
			}
		}
	}
	if h := line(); h != "ok 3 2 raw" {
		t.Fatalf("header %q", h)
	}
	raw := make([]byte, 6)
	if _, err := r.Read(raw); err != nil {
		t.Fatal(err)
	}
	for k, b := range raw {
		if int(int8(b)) != mapgen.Height(seed, 10+int64(k%3), -20+int64(k/3)) {
			t.Fatalf("raw byte %d = %d", k, int8(b))
		}
	}
	if h := line(); h != "ok 2 1 heights" {
		t.Fatalf("header %q", h)
	}
	line()
	if got := line(); got != "ok "+strconv.Itoa(mapgen.Height(seed, 1, 2)) {
		t.Fatalf("tile reply %q", got)
	}
	if got := line(); !strings.HasPrefix(got, "error ") {
		t.Fatalf("bogus reply %q", got)
	}
	if got := line(); !strings.HasPrefix(got, "error ") {
		t.Fatalf("empty chunk reply %q", got)
	}
	if rest, _ := r.ReadString(0); rest != "" {
		t.Fatalf("reply after quit: %q", rest)
	}
}
