package mapgen

import "testing"

// Every node of a 3x3 block of cells must be reachable from the others by
// stepping 4-directionally on corridor tiles alone. This checks the shape
// guarantees in corridor.go: the band never pinches below 4-connectivity and
// node discs join the corridors that meet there.
func TestCorridorConnected(t *testing.T) {
	cases := []struct {
		seed   uint64
		i0, j0 int64
	}{{1, 0, 0}, {2, -1, 3}, {3, 5, -2}, {42, 1 << 30, -(1 << 30)}}
	for _, c := range cases {
		x0, y0 := c.i0<<corridorShift, c.j0<<corridorShift
		x1, y1 := x0+3*CorridorCell, y0+3*CorridorCell
		sx, sy := Node(c.seed, c.i0, c.j0)
		seen := map[[2]int64]bool{{sx, sy}: true}
		stack := [][2]int64{{sx, sy}}
		for len(stack) > 0 {
			p := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			for _, d := range [4][2]int64{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
				q := [2]int64{p[0] + d[0], p[1] + d[1]}
				if q[0] < x0 || q[0] >= x1 || q[1] < y0 || q[1] >= y1 || seen[q] {
					continue
				}
				if OnCorridor(c.seed, q[0], q[1]) {
					seen[q] = true
					stack = append(stack, q)
				}
			}
		}
		for j := c.j0; j < c.j0+3; j++ {
			for i := c.i0; i < c.i0+3; i++ {
				nx, ny := Node(c.seed, i, j)
				if !seen[[2]int64{nx, ny}] {
					t.Errorf("seed %d: node of cell (%d,%d) not reachable over corridors", c.seed, i, j)
				}
			}
		}
		t.Logf("seed %d: %d corridor tiles connect all 9 nodes", c.seed, len(seen))
	}
}

// eachEdgeTile must report exactly the tiles contains accepts: brute force
// over the edge's bounding box and compare.
func TestEdgeEnumerationComplete(t *testing.T) {
	for _, c := range []struct {
		seed uint64
		i, j int64
		h    bool
	}{{1, 0, 0, true}, {1, 0, 0, false}, {7, -3, 2, true}, {9, 4, -1, false}} {
		e := newEdge(c.seed, c.i, c.j, c.h)
		got := map[[2]int64]int{}
		eachEdgeTile(e, func(x, y int64) { got[[2]int64{x, y}]++ })
		bx, by := e.ax+int64(e.dx*e.length), e.ay+int64(e.dy*e.length)
		pad := int64(e.reach) + 3
		want := 0
		for y := min(e.ay, by) - pad; y <= max(e.ay, by)+pad; y++ {
			for x := min(e.ax, bx) - pad; x <= max(e.ax, bx)+pad; x++ {
				if !e.contains(x, y) {
					continue
				}
				want++
				if got[[2]int64{x, y}] != 1 {
					t.Fatalf("seed %d edge (%d,%d,%v): tile (%d,%d) reported %d times", c.seed, c.i, c.j, c.h, x, y, got[[2]int64{x, y}])
				}
			}
		}
		if len(got) != want {
			t.Fatalf("seed %d edge (%d,%d,%v): enumerated %d tiles, brute force found %d", c.seed, c.i, c.j, c.h, len(got), want)
		}
	}
}

// Corridor tiles are always passable, whatever terrain was underneath.
func TestCorridorPassable(t *testing.T) {
	n := 0
	eachCorridorTile(5, 2, 3, func(x, y int64) {
		if n%7 == 0 && !Passable(5, x, y) {
			t.Fatalf("corridor tile (%d,%d) is not passable", x, y)
		}
		if n%997 == 0 && !OnCorridor(5, x, y) {
			t.Fatalf("enumerated tile (%d,%d) fails OnCorridor", x, y)
		}
		n++
	})
}

// With a small ring, the goal found by the scan is the only tile IsGoal
// accepts among all corridor tiles in the ring, and it matches across runs.
func TestGoalUnique(t *testing.T) {
	const seed uint64 = 11
	const rmin, rmax int64 = 10000, 30000
	g := findGoal(seed, rmin, rmax, nil)
	if g2 := findGoal(seed, rmin, rmax, nil); g2.X != g.X || g2.Y != g.Y || g2.Digest != g.Digest {
		t.Fatalf("goal changed between runs: %+v vs %+v", g, g2)
	}
	if !isGoal(seed, g.Digest, g.X, g.Y, rmin, rmax) {
		t.Fatalf("IsGoal rejects the goal found by the scan")
	}
	sx, sy := Start(seed)
	if !Passable(seed, sx, sy) || !Passable(seed, g.X, g.Y) {
		t.Fatalf("start or goal not passable")
	}
	matches := 0
	cells := (rmax >> corridorShift) + 2
	ci, cj := sx>>corridorShift, sy>>corridorShift
	for j := cj - cells; j <= cj+cells; j++ {
		for i := ci - cells; i <= ci+cells; i++ {
			eachCorridorTile(seed, i, j, func(x, y int64) {
				if x == g.X && y == g.Y {
					return
				}
				if isGoal(seed, g.Digest, x, y, rmin, rmax) {
					matches++
				}
			})
		}
	}
	if matches != 0 {
		t.Fatalf("%d other tiles pass IsGoal", matches)
	}
	t.Logf("goal (%d,%d) digest %s after hashing %d tiles", g.X, g.Y, g.Digest, g.Hashed)
}
