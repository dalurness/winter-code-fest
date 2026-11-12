package mapgen

import "math"

// The corridor network guarantees that the map is connected where it
// matters. The plane is cut into CorridorCell x CorridorCell cells. Each cell
// has one node at a seed-chosen spot near its middle, and every node is joined
// to its four neighbours by a winding corridor of air. A grid in which every
// node links to its neighbours is connected, so any corridor tile can reach
// any other corridor tile.
//
// Corridors are a pure function of the seed, like everything else. They are
// carved after all other terrain, so nothing can block them. The start and
// the goal both lie on corridors, which is what makes every seed solvable.
//
// Shape guarantees, which TestCorridorConnected checks:
//   - A corridor is the band |s - off(t)| <= corridorHalfWidth around a centre
//     line that wiggles sideways by off(t). Here t in [0, 1] is the position
//     along the straight line between two nodes and s is the sideways distance
//     from that line.
//   - off(t) is 0 at both ends, and its slope is at most 0.9. So the band is
//     always at least 2*2/sqrt(1+0.81) ≈ 3 tiles thick, which keeps it
//     4-connected at any angle.
//   - A disc of radius corridorNodeRadius around each node joins the ends of
//     its four corridors.
//   - Nodes sit in the middle half of their cell and the wiggle is at most
//     about 0.11 cells, so a corridor never leaves the two cells it joins.
//     A tile therefore only has to check the four corridors of its own cell.

const (
	corridorShift      = 13
	CorridorCell       = 1 << corridorShift // 8192 tiles
	corridorHalfWidth  = 2.0
	corridorNodeRadius = 4
	corridorMaxSlope   = 0.9
	saltCorridorNode   = 0xc0441d0
	saltCorridorEdge   = 0xc0441d1
)

// Node returns the corridor node of cell (i, j).
func Node(seed uint64, i, j int64) (int64, int64) {
	h := hash2(layer(seed, saltCorridorNode), i, j)
	q := int64(CorridorCell / 4)
	ox := q + int64(h%uint64(2*q))
	oy := q + int64((h>>32)%uint64(2*q))
	return i<<corridorShift + ox, j<<corridorShift + oy
}

// edge is the corridor between node A and node B.
type edge struct {
	ax, ay     int64   // node A
	dx, dy     float64 // unit direction A -> B
	length     float64
	amp        float64 // signed wiggle amplitude in tiles
	f1, f2     float64
	ph1, ph2   float64
	reach      float64 // |amp| + half width: no band tile is further sideways
	horizontal bool
}

// newEdge builds the corridor from node (i, j) to its east neighbour
// (horizontal) or its south neighbour.
func newEdge(seed uint64, i, j int64, horizontal bool) edge {
	ax, ay := Node(seed, i, j)
	var bx, by int64
	var key uint64
	if horizontal {
		bx, by = Node(seed, i+1, j)
		key = hash2(layer(seed, saltCorridorEdge), i, j)
	} else {
		bx, by = Node(seed, i, j+1)
		key = hash2(layer(seed, saltCorridorEdge)^0x5bd1e995, i, j)
	}
	fx, fy := float64(bx-ax), float64(by-ay)
	l := math.Hypot(fx, fy)
	e := edge{ax: ax, ay: ay, dx: fx / l, dy: fy / l, length: l, horizontal: horizontal}
	r := key
	next := func() float64 { r = mix(r + 0x9e3779b97f4a7c15); return unit(r) }
	e.f1 = 1 + 1.5*next()
	e.f2 = 3 + 3*next()
	e.ph1 = 2 * math.Pi * next()
	e.ph2 = 2 * math.Pi * next()
	// |g'(t)| <= bound for g below, so the slope amp*g'/length stays <= 0.9.
	bound := math.Pi + (2*math.Pi*e.f1+math.Pi*e.f2)/1.5
	e.amp = corridorMaxSlope * l / bound
	if next() < 0.5 {
		e.amp = -e.amp
	}
	e.reach = math.Abs(e.amp) + corridorHalfWidth
	return e
}

// g is the wiggle shape: zero at both ends, |g| <= 1.
func (e *edge) g(t float64) float64 {
	n := (math.Sin(2*math.Pi*e.f1*t+e.ph1) + 0.5*math.Sin(2*math.Pi*e.f2*t+e.ph2)) / 1.5
	return math.Sin(math.Pi*t) * n
}

// contains reports whether tile (x, y) is inside this corridor's band.
func (e *edge) contains(x, y int64) bool {
	rx, ry := float64(x-e.ax), float64(y-e.ay)
	u := rx*e.dx + ry*e.dy
	if u < 0 || u > e.length {
		return false
	}
	s := -rx*e.dy + ry*e.dx
	if math.Abs(s) > e.reach {
		return false
	}
	return math.Abs(s-e.amp*e.g(u/e.length)) <= corridorHalfWidth
}

// centre returns the centre line point at distance u along the edge,
// relative to node A.
func (e *edge) centre(u float64) (float64, float64) {
	o := e.amp * e.g(u/e.length)
	return u*e.dx - o*e.dy, u*e.dy + o*e.dx
}

// OnCorridor reports whether tile (x, y) is part of the corridor network.
func OnCorridor(seed uint64, x, y int64) bool {
	ci, cj := x>>corridorShift, y>>corridorShift
	nx, ny := Node(seed, ci, cj)
	if ddx, ddy := x-nx, y-ny; ddx*ddx+ddy*ddy <= corridorNodeRadius*corridorNodeRadius {
		return true
	}
	for _, c := range [4]struct {
		i, j int64
		h    bool
	}{{ci - 1, cj, true}, {ci, cj, true}, {ci, cj - 1, false}, {ci, cj, false}} {
		e := newEdge(seed, c.i, c.j, c.h)
		if e.contains(x, y) {
			return true
		}
	}
	return false
}

// eachCorridorTile calls fn for every tile of the corridors owned by cell
// (i, j): its node disc, its east corridor and its south corridor. Every
// corridor tile of the map is owned by exactly one cell. A tile can be
// reported more than once where corridors overlap near a node.
func eachCorridorTile(seed uint64, i, j int64, fn func(x, y int64)) {
	nx, ny := Node(seed, i, j)
	const r = corridorNodeRadius
	for dy := int64(-r); dy <= r; dy++ {
		for dx := int64(-r); dx <= r; dx++ {
			if dx*dx+dy*dy <= r*r {
				fn(nx+dx, ny+dy)
			}
		}
	}
	eachEdgeTile(newEdge(seed, i, j, true), fn)
	eachEdgeTile(newEdge(seed, i, j, false), fn)
}

// eachEdgeTile visits every tile in an edge's band exactly once. It walks
// the centre line in quarter-tile steps and, for each line of tiles across
// the major axis (columns for a horizontal edge, rows for a vertical one),
// records a range that is sure to cover the band. Then it tests each tile in
// those ranges against contains.
//
// Coverage: every band tile is within corridorHalfWidth of the centre line
// at its own position along the edge, and samples are at most 0.125 tiles
// apart along the edge. So it is within corridorHalfWidth+0.2 of some sample,
// and the ±(half width + 1) window around each sample includes it.
func eachEdgeTile(e edge, fn func(x, y int64)) {
	const pad = corridorHalfWidth + 1
	// a = major axis, b = minor axis, both relative to node A.
	major := func(px, py float64) (float64, float64) {
		if e.horizontal {
			return px, py
		}
		return py, px
	}
	ea, _ := major(e.dx*e.length, e.dy*e.length)
	a0 := int64(math.Floor(math.Min(0, ea) - e.reach - pad - 1))
	a1 := int64(math.Ceil(math.Max(0, ea) + e.reach + pad + 1))
	n := int(a1 - a0 + 1)
	lo := make([]float64, n)
	hi := make([]float64, n)
	for k := range lo {
		lo[k], hi[k] = math.Inf(1), math.Inf(-1)
	}
	for u := 0.0; u <= e.length+0.25; u += 0.25 {
		cx, cy := e.centre(math.Min(u, e.length))
		ca, cb := major(cx, cy)
		for a := int64(math.Floor(ca - pad)); a <= int64(math.Ceil(ca+pad)); a++ {
			k := a - a0
			lo[k] = math.Min(lo[k], cb-pad)
			hi[k] = math.Max(hi[k], cb+pad)
		}
	}
	for k := 0; k < n; k++ {
		if lo[k] > hi[k] {
			continue
		}
		a := a0 + int64(k)
		for b := int64(math.Ceil(lo[k])); b <= int64(math.Floor(hi[k])); b++ {
			x, y := e.ax+a, e.ay+b
			if !e.horizontal {
				x, y = e.ax+b, e.ay+a
			}
			if e.contains(x, y) {
				fn(x, y)
			}
		}
	}
}

// EachCorridorLine calls fn at points every step tiles along the centre line
// of every corridor that may pass through the box [x0, x1) x [y0, y1). It is
// for drawing the network when zoomed out, where testing tiles would miss it.
func EachCorridorLine(seed uint64, x0, y0, x1, y1 int64, step float64, fn func(x, y int64)) {
	step = math.Max(step, 0.5)
	cells := ((x1 - x0) >> corridorShift) * ((y1 - y0) >> corridorShift)
	if cells > 40000 {
		return // too far out for the network to be visible anyway
	}
	for j := y0>>corridorShift - 1; j <= y1>>corridorShift; j++ {
		for i := x0>>corridorShift - 1; i <= x1>>corridorShift; i++ {
			for _, h := range []bool{true, false} {
				e := newEdge(seed, i, j, h)
				for u := 0.0; u <= e.length; u += step {
					cx, cy := e.centre(u)
					fn(e.ax+int64(math.Round(cx)), e.ay+int64(math.Round(cy)))
				}
			}
		}
	}
}
