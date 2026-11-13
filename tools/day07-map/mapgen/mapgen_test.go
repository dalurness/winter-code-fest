package mapgen

import "testing"

func TestDeterministic(t *testing.T) {
	coords := [][2]int64{{0, 0}, {123, -456}, {1 << 40, -(1 << 40)}, {-9e18, 9e18}}
	for _, c := range coords {
		a := Height(42, c[0], c[1])
		for i := 0; i < 3; i++ {
			if b := Height(42, c[0], c[1]); b != a {
				t.Fatalf("Height(42,%d,%d) changed: %d then %d", c[0], c[1], a, b)
			}
		}
		if a < MinHeight || a > MaxHeight {
			t.Fatalf("height %d out of range", a)
		}
	}
}

// Golden values pin the generator: if this fails, every published map changed.
func TestGolden(t *testing.T) {
	var sum int64
	for y := int64(-50); y < 50; y++ {
		for x := int64(-50); x < 50; x++ {
			sum = sum*31 + int64(Height(1, x*97, y*89)+8)
		}
	}
	t.Logf("golden checksum %d", sum)
	if golden != 0 && sum != golden {
		t.Fatalf("checksum %d, want %d", sum, golden)
	}
}

// Seeds differ.
func TestSeedsDiffer(t *testing.T) {
	same := 0
	for i := int64(0); i < 1000; i++ {
		if Height(1, i*37, i*11) == Height(2, i*37, i*11) {
			same++
		}
	}
	if same > 500 {
		t.Fatalf("seeds 1 and 2 agree on %d/1000 tiles", same)
	}
}

// Same terrain shape far from the origin: no float precision loss.
func TestFarAway(t *testing.T) {
	var hist [17]int
	for y := int64(0); y < 200; y++ {
		for x := int64(0); x < 200; x++ {
			hist[Height(7, 1<<62+x*13, -(1<<62)+y*13)+8]++
		}
	}
	nonzero := 0
	for _, n := range hist {
		if n > 0 {
			nonzero++
		}
	}
	if nonzero < 6 {
		t.Fatalf("terrain near 2^62 looks flat: %v", hist)
	}
}

// Connectivity report over a window: share of passable tiles in the largest
// 4-connected component.
func TestConnectivity(t *testing.T) {
	if testing.Short() {
		t.Skip()
	}
	for _, seed := range []uint64{1, 2, 3} {
		const n = 1536
		x0, y0 := int64(-n/2), int64(-n/2)
		pass := make([]bool, n*n)
		air := 0
		for j := 0; j < n; j++ {
			for i := 0; i < n; i++ {
				pass[j*n+i] = Passable(seed, x0+int64(i), y0+int64(j))
				if pass[j*n+i] {
					air++
				}
			}
		}
		comp := make([]int32, n*n)
		best, id := 0, int32(0)
		stack := []int{}
		for s := range pass {
			if !pass[s] || comp[s] != 0 {
				continue
			}
			id++
			size := 0
			stack = append(stack[:0], s)
			comp[s] = id
			for len(stack) > 0 {
				c := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				size++
				i, j := c%n, c/n
				for _, d := range [][2]int{{1, 0}, {-1, 0}, {0, 1}, {0, -1}} {
					a, b := i+d[0], j+d[1]
					if a < 0 || b < 0 || a >= n || b >= n {
						continue
					}
					k := b*n + a
					if pass[k] && comp[k] == 0 {
						comp[k] = id
						stack = append(stack, k)
					}
				}
			}
			best = max(best, size)
		}
		t.Logf("seed %d: %.1f%% passable, largest component holds %.1f%% of air, %d components",
			seed, 100*float64(air)/(n*n), 100*float64(best)/float64(air), id)
	}
}
