package mapgen

import (
	"math"
	"testing"
)

// Every link in a 3x3 block of cells must join its two nodes over its own
// band and the node discs, stepping 4-directionally. This checks the band
// shape guarantees in corridor.go at several seeds, including near 2^43.
func TestCorridorLinks(t *testing.T) {
	cases := []struct {
		seed   uint64
		i0, j0 int64
	}{{1, 0, 0}, {2, -1, 3}, {3, 5, -2}, {42, 1 << 30, -(1 << 30)}}
	for _, c := range cases {
		links, tiles := 0, 0
		for j := c.j0; j < c.j0+3; j++ {
			for i := c.i0; i < c.i0+3; i++ {
				for _, h := range []bool{true, false} {
					if LinkDropped(c.seed, i, j, h) {
						continue
					}
					links++
					tiles += floodLink(t, c.seed, i, j, h)
				}
			}
		}
		t.Logf("seed %d: %d links joined over %d band tiles", c.seed, links, tiles)
	}
}

// floodLink floods from node A of a link over its band and both node discs
// and fails unless it reaches node B. It returns the tiles visited.
func floodLink(t *testing.T, seed uint64, i, j int64, horizontal bool) int {
	e := newEdge(seed, i, j, horizontal)
	ax, ay := Node(seed, i, j)
	bx, by := Node(seed, i+1, j)
	if !horizontal {
		bx, by = Node(seed, i, j+1)
	}
	inDisc := func(x, y, nx, ny int64) bool {
		return (x-nx)*(x-nx)+(y-ny)*(y-ny) <= corridorNodeRadius*corridorNodeRadius
	}
	ok := func(x, y int64) bool {
		if inDisc(x, y, ax, ay) || inDisc(x, y, bx, by) {
			return true
		}
		sp, near := e.measure(x, y, 0)
		return near && sp.out <= 0
	}
	seen := map[[2]int64]bool{{ax, ay}: true}
	stack := [][2]int64{{ax, ay}}
	for len(stack) > 0 {
		p := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		for _, d := range [4][2]int64{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
			q := [2]int64{p[0] + d[0], p[1] + d[1]}
			if !seen[q] && ok(q[0], q[1]) {
				if !OnCorridor(seed, q[0], q[1]) {
					t.Fatalf("seed %d: band tile (%d,%d) not reported by OnCorridor", seed, q[0], q[1])
				}
				seen[q] = true
				stack = append(stack, q)
			}
		}
	}
	if !seen[[2]int64{bx, by}] {
		t.Errorf("seed %d: link from cell (%d,%d) horizontal=%v does not reach its far node", seed, i, j, horizontal)
	}
	return len(seen)
}

// Even faces lose at most one link and odd faces drop none, which is what
// keeps the network connected (see corridor.go). Some links must be
// dropped, and every node keeps at least two.
func TestCorridorDrops(t *testing.T) {
	const seed = 9
	dropped := 0
	for j := int64(-40); j < 40; j++ {
		for i := int64(-40); i < 40; i++ {
			top := LinkDropped(seed, i, j, true)
			bottom := LinkDropped(seed, i, j+1, true)
			left := LinkDropped(seed, i, j, false)
			right := LinkDropped(seed, i+1, j, false)
			n := 0
			for _, d := range []bool{top, bottom, left, right} {
				if d {
					n++
				}
			}
			// An even face borders only odd faces, which drop nothing, so
			// it loses at most the one link it drops itself. That leaves a
			// three-link detour around it for the dropped link.
			if (i+j)&1 == 0 && n > 1 {
				t.Fatalf("even face (%d,%d) lost %d links", i, j, n)
			}
			if top {
				dropped++
			}
			degree := 0
			for _, d := range []bool{
				LinkDropped(seed, i, j, true), LinkDropped(seed, i-1, j, true),
				LinkDropped(seed, i, j, false), LinkDropped(seed, i, j-1, false),
			} {
				if !d {
					degree++
				}
			}
			if degree < 2 {
				t.Fatalf("node (%d,%d) has only %d links", i, j, degree)
			}
		}
	}
	for j := int64(-40); j < 40; j++ {
		for i := int64(-40); i < 40; i++ {
			if (i+j)&1 == 0 {
				continue
			}
			// No link of an odd face may be dropped by that face.
			if faceDrop(seed, i, j) != 0 {
				t.Fatalf("odd face (%d,%d) drops a link", i, j)
			}
		}
	}
	if dropped == 0 {
		t.Fatal("no east links dropped")
	}
	t.Logf("%d of 6400 east links dropped", dropped)
}

// The network is connected: flood the abstract node graph over a 60x60
// block, allowing paths one ring outside it, and reach every node.
func TestCorridorGraph(t *testing.T) {
	for _, seed := range []uint64{1, 9, 77} {
		const n = 60
		seen := map[[2]int64]bool{{0, 0}: true}
		stack := [][2]int64{{0, 0}}
		for len(stack) > 0 {
			p := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			i, j := p[0], p[1]
			for _, l := range []struct {
				di, dj, li, lj int64
				h              bool
			}{{1, 0, i, j, true}, {-1, 0, i - 1, j, true}, {0, 1, i, j, false}, {0, -1, i, j - 1, false}} {
				q := [2]int64{i + l.di, j + l.dj}
				if q[0] < -1 || q[0] > n || q[1] < -1 || q[1] > n || seen[q] || LinkDropped(seed, l.li, l.lj, l.h) {
					continue
				}
				seen[q] = true
				stack = append(stack, q)
			}
		}
		for j := int64(0); j < n; j++ {
			for i := int64(0); i < n; i++ {
				if !seen[[2]int64{i, j}] {
					t.Fatalf("seed %d: node (%d,%d) unreachable", seed, i, j)
				}
			}
		}
	}
}

// Corridor tiles are always passable, whatever terrain was underneath.
func TestCorridorPassable(t *testing.T) {
	const seed = 5
	n := 0
	for y := int64(0); y < 2*CorridorCell; y += 5 {
		for x := int64(0); x < 2*CorridorCell; x += 5 {
			if OnCorridor(seed, x, y) {
				n++
				if !Passable(seed, x, y) {
					t.Fatalf("corridor tile (%d,%d) is not passable", x, y)
				}
			}
		}
	}
	if n < 1000 {
		t.Fatalf("only %d corridor tiles sampled", n)
	}
}

// The goal is a passable corridor node at roughly the promised distance, the
// only tile IsGoal accepts, and the same on every call.
func TestGoal(t *testing.T) {
	for seed := uint64(0); seed < 50; seed++ {
		gx, gy := Goal(seed)
		if hx, hy := Goal(seed); hx != gx || hy != gy {
			t.Fatalf("seed %d: goal changed between calls", seed)
		}
		if !OnCorridor(seed, gx, gy) || !Passable(seed, gx, gy) {
			t.Fatalf("seed %d: goal (%d,%d) is not a passable corridor tile", seed, gx, gy)
		}
		sx, sy := Start(seed)
		d := math.Hypot(float64(gx-sx), float64(gy-sy))
		if d < GoalMinDistance-2*CorridorCell || d > GoalMaxDistance+2*CorridorCell {
			t.Fatalf("seed %d: goal is %.0f tiles from the start", seed, d)
		}
		if !IsGoal(seed, gx, gy) || IsGoal(seed, gx+1, gy) || IsGoal(seed, gx, gy-1) {
			t.Fatalf("seed %d: IsGoal does not pick out exactly the goal", seed)
		}
	}
}
