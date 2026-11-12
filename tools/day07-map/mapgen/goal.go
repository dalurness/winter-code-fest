package mapgen

import "math"

// Rect is a half-open rectangle of tiles: X0 <= x < X1, Y0 <= y < Y1.
type Rect struct{ X0, Y0, X1, Y1 int64 }

func (r Rect) Contains(x, y int64) bool { return x >= r.X0 && x < r.X1 && y >= r.Y0 && y < r.Y1 }
func (r Rect) Area() float64            { return float64(r.X1-r.X0) * float64(r.Y1-r.Y0) }

const (
	// GoalDistance is how far the centre of the goal region is from the
	// origin, in tiles (about a million).
	GoalDistance = 1 << 20
	// GoalRegionSize is the side of the square region the goal hides in.
	GoalRegionSize = 1 << 12
	// GoalMaxHeight: goal tiles are always open lowland, never canyon floors
	// or the passable rim of a mountain, so they are rarely in sealed pockets.
	GoalMaxHeight = -2
	// goalOdds is the chance a tile in the region passes the hash test. With
	// roughly a third of tiles at height -2 or lower this gives about one
	// goal per region; Scan reports the real count for a seed.
	goalOdds = 3.0 / (GoalRegionSize * GoalRegionSize)
)

// Start returns the start tile: the first passable tile on an outward square
// spiral from the origin.
func Start(seed uint64) (int64, int64) { return NearestPassable(seed, 0, 0) }

// NearestPassable walks a square spiral out from (x, y) and returns the first
// passable tile. The spiral order makes the answer deterministic.
func NearestPassable(seed uint64, x, y int64) (int64, int64) {
	if Passable(seed, x, y) {
		return x, y
	}
	for r := int64(1); ; r++ {
		for i := -r; i <= r; i++ {
			for _, c := range [][2]int64{{x + i, y - r}, {x + r, y + i}, {x - i, y + r}, {x - r, y - i}} {
				if Passable(seed, c[0], c[1]) {
					return c[0], c[1]
				}
			}
		}
	}
}

// GoalRegion is the publicly known square the goal is somewhere inside. Its
// direction from the origin comes from the seed; its distance is fixed.
func GoalRegion(seed uint64) Rect {
	a := 2 * math.Pi * unit(layer(seed, saltGoal))
	cx := int64(math.Round(math.Cos(a) * GoalDistance))
	cy := int64(math.Round(math.Sin(a) * GoalDistance))
	h := int64(GoalRegionSize / 2)
	return Rect{cx - h, cy - h, cx + h, cy + h}
}

// goalThreshold is goalOdds as a 64-bit hash threshold.
var goalThreshold = uint64(goalOdds * (1 << 63) * 2)

// IsGoal reports whether (x, y) is a goal tile: inside the goal region, open
// lowland, and lucky on a keyed hash. The hash test runs first because it is
// much cheaper than Height.
//
// This is "discoverable only by querying tiles" in the weak sense: nothing
// about the seed tells you where the goal is, but anyone can scan the whole
// region with IsGoal without walking anywhere (see Scan and DESIGN.md).
func IsGoal(seed uint64, x, y int64) bool {
	if !GoalRegion(seed).Contains(x, y) {
		return false
	}
	if hash2(layer(seed, saltGoal)^0xa5a5a5a5, x, y) >= goalThreshold {
		return false
	}
	return Height(seed, x, y) <= GoalMaxHeight
}

// Scan checks every tile of the goal region and returns the goal tiles. It
// costs about GoalRegionSize^2 hashes plus a handful of Height calls.
func Scan(seed uint64) [][2]int64 {
	r := GoalRegion(seed)
	key := layer(seed, saltGoal) ^ 0xa5a5a5a5
	var out [][2]int64
	for y := r.Y0; y < r.Y1; y++ {
		for x := r.X0; x < r.X1; x++ {
			if hash2(key, x, y) < goalThreshold && Height(seed, x, y) <= GoalMaxHeight {
				out = append(out, [2]int64{x, y})
			}
		}
	}
	return out
}
