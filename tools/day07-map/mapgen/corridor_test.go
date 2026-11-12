package mapgen

import (
	"math"
	"testing"
)

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

// Corridor tiles are always passable, whatever terrain was underneath.
func TestCorridorPassable(t *testing.T) {
	const seed = 5
	n := 0
	for y := int64(0); y < 2*CorridorCell; y += 3 {
		for x := int64(0); x < 2*CorridorCell; x += 3 {
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
