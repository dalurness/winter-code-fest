package mapgen

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
)

// The goal, and why it is unique, reachable and not derivable from the seed:
//
//   - Candidates are the corridor tiles whose distance from the start is in
//     [RingMin, RingMax). There are about 650 million of them.
//   - Every candidate gets a SHA-256 digest of (seed, x, y). The goal is the
//     candidate with the smallest digest. A minimum is unique (two tiles
//     sharing a SHA-256 digest is a collision nobody has ever found), so every
//     seed has exactly one goal.
//   - The goal is a corridor tile, and the corridor network is connected and
//     contains the start, so it is always reachable.
//   - Solvers get the seed and the goal digest. IsGoal compares a tile's
//     digest with it. SHA-256 cannot be run backwards, so the only way to find
//     the goal is to hash candidates until one matches, which means walking
//     the whole corridor network inside the ring. (The fast mixer used for
//     terrain would not do here: it is invertible, so for any x you could
//     solve for the matching y and skip the scan.)

const (
	// RingMin and RingMax bound the goal's Euclidean distance from the start.
	RingMin = 1 << 18
	RingMax = 1 << 19
)

// Digest is a SHA-256 digest identifying the goal tile.
type Digest [32]byte

func (d Digest) String() string { return hex.EncodeToString(d[:]) }

// ParseDigest parses a 64-character hex digest.
func ParseDigest(s string) (Digest, error) {
	var d Digest
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != len(d) {
		return d, fmt.Errorf("goal digest must be 64 hex characters")
	}
	copy(d[:], b)
	return d, nil
}

// TileDigest is the SHA-256 of "wcfday07" followed by the seed, x and y as
// little-endian 64-bit integers.
func TileDigest(seed uint64, x, y int64) Digest {
	var buf [32]byte
	copy(buf[:8], "wcfday07")
	binary.LittleEndian.PutUint64(buf[8:], seed)
	binary.LittleEndian.PutUint64(buf[16:], uint64(x))
	binary.LittleEndian.PutUint64(buf[24:], uint64(y))
	return sha256.Sum256(buf[:])
}

// Start is the corridor node of cell (0, 0).
func Start(seed uint64) (int64, int64) { return Node(seed, 0, 0) }

// InRing reports whether (x, y) is in the ring the goal is chosen from.
func InRing(seed uint64, x, y int64) bool { return inRing(seed, x, y, RingMin, RingMax) }

func inRing(seed uint64, x, y, rmin, rmax int64) bool {
	sx, sy := Start(seed)
	dx, dy := x-sx, y-sy
	if dx < -rmax || dx > rmax || dy < -rmax || dy > rmax {
		return false
	}
	d := dx*dx + dy*dy
	return d >= rmin*rmin && d < rmax*rmax
}

// IsGoal reports whether (x, y) is the goal for this seed and goal digest.
func IsGoal(seed uint64, goal Digest, x, y int64) bool {
	return isGoal(seed, goal, x, y, RingMin, RingMax)
}

func isGoal(seed uint64, goal Digest, x, y, rmin, rmax int64) bool {
	return inRing(seed, x, y, rmin, rmax) && OnCorridor(seed, x, y) && TileDigest(seed, x, y) == goal
}

// Goal is the result of FindGoal.
type Goal struct {
	X, Y   int64
	Digest Digest
	// Hashed counts candidate tiles hashed, including the few tiles counted
	// twice where corridors overlap near a node.
	Hashed int64
}

// FindGoal walks every corridor tile in the ring, hashes it and returns the
// one with the smallest digest. This is what organisers run once per seed to
// get the digest they publish, and it is also the cheapest way for a solver
// to find the goal. It uses every CPU: about 20 s on an idle 12-core machine.
// progress, if not nil, is called with (cells done, cells total).
func FindGoal(seed uint64, progress func(done, total int)) Goal {
	return findGoal(seed, RingMin, RingMax, progress)
}

func findGoal(seed uint64, rmin, rmax int64, progress func(done, total int)) Goal {
	sx, sy := Start(seed)
	// A cell's corridors stay inside the 2x2 block of cells starting at it.
	type cell struct{ i, j int64 }
	var cells []cell
	for j := (sy-rmax)>>corridorShift - 1; j <= (sy+rmax)>>corridorShift; j++ {
		for i := (sx-rmax)>>corridorShift - 1; i <= (sx+rmax)>>corridorShift; i++ {
			x0, y0 := i<<corridorShift, j<<corridorShift
			x1, y1 := x0+2*CorridorCell, y0+2*CorridorCell
			near := sq(clamp(sx, x0, x1)-sx) + sq(clamp(sy, y0, y1)-sy)
			far := max(sq(x0-sx), sq(x1-sx)) + max(sq(y0-sy), sq(y1-sy))
			if near < rmax*rmax && far >= rmin*rmin {
				cells = append(cells, cell{i, j})
			}
		}
	}

	var next, done atomic.Int64
	results := make([]Goal, runtime.NumCPU())
	var wg sync.WaitGroup
	for w := range results {
		wg.Add(1)
		go func(best *Goal) {
			defer wg.Done()
			found := false
			for {
				k := next.Add(1) - 1
				if k >= int64(len(cells)) {
					break
				}
				c := cells[k]
				eachCorridorTile(seed, c.i, c.j, func(x, y int64) {
					if !inRing(seed, x, y, rmin, rmax) {
						return
					}
					best.Hashed++
					d := TileDigest(seed, x, y)
					if !found || bytes.Compare(d[:], best.Digest[:]) < 0 {
						best.X, best.Y, best.Digest, found = x, y, d, true
					}
				})
				n := done.Add(1)
				if progress != nil {
					progress(int(n), len(cells))
				}
			}
			if !found { // sorts after every real digest
				for i := range best.Digest {
					best.Digest[i] = 0xff
				}
			}
		}(&results[w])
	}
	wg.Wait()

	best := results[0]
	for _, r := range results[1:] {
		if bytes.Compare(r.Digest[:], best.Digest[:]) < 0 {
			best.X, best.Y, best.Digest = r.X, r.Y, r.Digest
		}
	}
	best.Hashed = 0
	for _, r := range results {
		best.Hashed += r.Hashed
	}
	return best
}

func sq(v int64) int64 { return v * v }

func clamp(v, lo, hi int64) int64 { return max(lo, min(v, hi)) }
