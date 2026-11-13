package mapgen

import "math"

// The goal is a corridor node chosen from the seed, so Goal(seed) gives it
// straight away. It is always reachable because the corridor network is
// connected and the start is a node too.
//
// For an extra-hard challenge, a solver can ignore Goal and find the goal
// by exploring and asking IsGoal about the tiles it visits.

const (
	// GoalMinDistance and GoalMaxDistance bound the point the goal is chosen
	// near. The goal is the node of the cell containing that point, so its
	// real distance from the start can be up to about one cell outside this
	// range.
	GoalMinDistance = 1 << 18
	GoalMaxDistance = 1 << 19
)

// Start is the corridor node of cell (0, 0).
func Start(seed uint64) (int64, int64) { return Node(seed, 0, 0) }

// Goal returns the goal tile: the corridor node of the cell containing a
// point at a seed-chosen angle and distance from the start.
func Goal(seed uint64) (int64, int64) {
	h := layer(seed, saltGoal)
	angle := 2 * math.Pi * unit(h)
	dist := GoalMinDistance + (GoalMaxDistance-GoalMinDistance)*unit(mix(h))
	sx, sy := Start(seed)
	px := sx + int64(math.Round(math.Cos(angle)*dist))
	py := sy + int64(math.Round(math.Sin(angle)*dist))
	return Node(seed, px>>corridorShift, py>>corridorShift)
}

// IsGoal reports whether (x, y) is the goal tile.
func IsGoal(seed uint64, x, y int64) bool {
	gx, gy := Goal(seed)
	return x == gx && y == gy
}
