package mapgen

import "math"

// The corridor network guarantees that the map is connected where it
// matters. The plane is cut into CorridorCell x CorridorCell cells. Each cell
// has one node at a seed-chosen spot near its middle. Nodes are joined to
// their neighbours by meandering valleys of air, and the network is connected
// by construction, so any corridor tile can reach any other corridor tile.
//
// Corridors are a pure function of the seed, like everything else. They are
// carved after all other terrain, so nothing can block them. The start and
// the goal are both corridor nodes, which is what makes every seed solvable.
//
// Looks: a corridor is meant to pass for a natural valley. Its centre line is
// a sum of six octaves of 1D gradient noise, from one or two big bends per
// cell down to bends every hundred tiles and a wobble every dozen. Its width, floor depth and how
// steeply the walls rise all vary along it. Only a core band is guaranteed
// to be air; around it the terrain slopes down into the valley, with noise on
// the walls, and where the land is already low the corridor leaves no mark.
// About one link in eight is missing, so the network is not a full grid.
//
// Guarantees, which corridor_test.go checks:
//   - Connectivity of the graph. Faces of the node grid (the square between
//     nodes (i, j) and (i+1, j+1)) whose i+j is even may drop one of their
//     four links; odd faces never drop any. Every link borders one even and
//     one odd face, so in the planar dual the dropped links form paths of
//     length at most 1 and never a cycle. A planar graph stays connected
//     unless its removed edges form a dual cycle, so the network is
//     connected. Each dropped link also has a three-link detour around its
//     own face.
//   - Connectivity of each link. An east link is the band of tiles (x, y)
//     with |y - c(x)| <= w(x) * sqrt(1 + min(c'(x), 8)^2), where c is the
//     centre line and w >= corridorMinHalfWidth is the perpendicular
//     half-width (south links swap x and y). Each column holds at least 3
//     tiles. Adjacent columns overlap when the centre line moves less than
//     2W-1 between them, where W is that vertical half-width: with |c'| <= 8
//     that holds because W >= 1.6*max(1, |c'|), and beyond 8 because
//     W >= 12.9 while the octave amplitudes bound |c'| below 20.
//   - The band starts and ends on the two nodes, and a disc of radius
//     corridorNodeRadius around each node joins the ends of its links.
//   - Nodes sit in the middle half of their cell and the centre line strays
//     at most corridorMaxOffset from the straight line between its nodes, so
//     a link and its sloped walls never leave the two cells it joins. A tile
//     therefore only has to look at the four links of its own cell.

const (
	corridorShift        = 13
	CorridorCell         = 1 << corridorShift // 8192 tiles
	corridorNodeRadius   = 4
	corridorMinHalfWidth = 1.6
	corridorMaxHalfWidth = corridorMinHalfWidth + 4.4
	corridorMaxOffset    = 1700 // sum of the octave amplitudes, rounded up
	corridorReach        = 150  // furthest a wall reaches sideways past the band
	corridorMaxSlope     = 8    // slope cap for the band's width correction
	corridorDropChance   = 0.5  // per even face, so 1 link in 8 is dropped
	corridorFloorMax     = -0.07
	corridorFloorMin     = -0.45
	corridorWallMin      = 0.035 // elevation rise per tile of the gentlest wall

	saltCorridorNode = 0xc0441d0
	saltCorridorEdge = 0xc0441d1
	saltCorridorDrop = 0xc0441d2
)

// corridorMaxStretch is sqrt(1 + corridorMaxSlope^2).
var corridorMaxStretch = math.Sqrt(1 + corridorMaxSlope*corridorMaxSlope)

// Node returns the corridor node of cell (i, j).
func Node(seed uint64, i, j int64) (int64, int64) {
	h := hash2(layer(seed, saltCorridorNode), i, j)
	q := int64(CorridorCell / 4)
	ox := q + int64(h%uint64(2*q))
	oy := q + int64((h>>32)%uint64(2*q))
	return i<<corridorShift + ox, j<<corridorShift + oy
}

// faceDrop says which link face (i, j) drops: 0 none, 1 its top (east link
// of node (i, j)), 2 its bottom (east link of (i, j+1)), 3 its left (south
// link of (i, j)) or 4 its right (south link of (i+1, j)).
func faceDrop(seed uint64, i, j int64) int {
	if (i+j)&1 != 0 {
		return 0
	}
	h := hash2(layer(seed, saltCorridorDrop), i, j)
	if unit(h) >= corridorDropChance {
		return 0
	}
	return 1 + int(mix(h)%4)
}

// LinkDropped reports whether the east (horizontal) or south link of node
// (i, j) is missing from the network.
func LinkDropped(seed uint64, i, j int64, horizontal bool) bool {
	if horizontal {
		return faceDrop(seed, i, j) == 1 || faceDrop(seed, i, j-1) == 2
	}
	return faceDrop(seed, i, j) == 3 || faceDrop(seed, i-1, j) == 4
}

// The centre line's sideways offset is a sum of these octaves. Big ones fade
// in and out with sin(pi t) so the line meets both nodes; small ones fade
// over the first and last 40 tiles. The amplitudes sum to under
// corridorMaxOffset.
var corridorOctaves = [...]struct {
	wavelength, amp float64
	big             bool
}{
	{3000, 1100, true},
	{1100, 380, true},
	{330, 140, true},
	{120, 40, false},
	{45, 8, false},
	{16, 1.5, false},
}

// edge is the link from node A to node B, described in (u, v) coordinates:
// u runs along the link's main axis (x for east links, y for south links)
// and v is the other axis.
type edge struct {
	au, av     int64
	length     float64 // bu - au, always 4096..12288
	dv         float64 // bv - av
	key        uint64
	horizontal bool
}

func newEdge(seed uint64, i, j int64, horizontal bool) edge {
	ax, ay := Node(seed, i, j)
	var bx, by int64
	salt := uint64(0)
	if horizontal {
		bx, by = Node(seed, i+1, j)
	} else {
		bx, by = Node(seed, i, j+1)
		ax, ay, bx, by = ay, ax, by, bx
		salt = 0x5bd1e995
	}
	return edge{
		au: ax, av: ay,
		length: float64(bx - ax), dv: float64(by - ay),
		key:        hash2(layer(seed, saltCorridorEdge)^salt, i, j),
		horizontal: horizontal,
	}
}

func (e *edge) uv(x, y int64) (int64, int64) {
	if e.horizontal {
		return x, y
	}
	return y, x
}

func (e *edge) xy(u, v int64) (int64, int64) {
	if e.horizontal {
		return u, v
	}
	return v, u
}

// noise1 is 1D gradient noise in [-1, 1] and its derivative.
func noise1(key uint64, t float64) (float64, float64) {
	fl := math.Floor(t)
	f := t - fl
	i := int64(fl)
	g0 := 2*unit(hash2(key, i, 0)) - 1
	g1 := 2*unit(hash2(key, i+1, 0)) - 1
	a, b := g0*f, g1*(f-1)
	s := f * f * f * (f*(f*6-15) + 10)
	ds := 30 * f * f * (f - 1) * (f - 1)
	return 2 * (a + s*(b-a)), 2 * (g0 + ds*(b-a) + s*(g1-g0))
}

// smooth01 is a noise channel of the edge mapped to [0, 1].
func (e *edge) smooth01(channel uint64, lu, wavelength float64) float64 {
	n, _ := noise1(mix(e.key+channel), lu/wavelength)
	return 0.5 + 0.5*n
}

// centre returns the centre line's v (relative to node A) and slope dv/du at
// lu tiles along the main axis from node A.
func (e *edge) centre(lu float64) (float64, float64) {
	c, s, _ := e.centreNear(lu, 0, math.Inf(1))
	return c, s
}

// centreNear is centre, but it gives up (ok false) as soon as the remaining
// octaves can no longer bring the centre line within margin of lv.
func (e *edge) centreNear(lu, lv, margin float64) (c, s float64, ok bool) {
	t := lu / e.length
	c, s = e.dv*t, e.dv/e.length
	env := math.Sin(math.Pi * t)
	denv := math.Pi * math.Cos(math.Pi*t) / e.length
	small := math.Min(1, math.Min(lu, e.length-lu)/40)
	left := float64(corridorMaxOffset)
	for k, o := range corridorOctaves {
		if math.Abs(lv-c) > left+margin {
			return c, s, false
		}
		left -= o.amp
		n, dn := noise1(mix(e.key+uint64(k)+1), lu/o.wavelength+0.37*float64(k))
		if o.big {
			c += o.amp * n * env
			s += o.amp * (dn/o.wavelength*env + n*denv)
		} else {
			c += o.amp * n * small
			s += o.amp * dn / o.wavelength * small
		}
	}
	return c, s, true
}

// halfWidth is the perpendicular half-width of the guaranteed band.
func (e *edge) halfWidth(lu float64) float64 {
	q := e.smooth01(11, lu, 450)
	return corridorMinHalfWidth + (corridorMaxHalfWidth-corridorMinHalfWidth)*q*q
}

// span holds what a tile needs to know about one link.
type span struct {
	out   float64 // perpendicular distance outside the band (<= 0: inside)
	floor float64 // elevation of the valley floor here
	wall  float64 // elevation rise per tile outside the band
}

// measure locates tile (x, y) relative to the link. It reports false when
// the tile is further than reach tiles outside the widest possible band.
func (e *edge) measure(x, y int64, reach float64) (span, bool) {
	u, v := e.uv(x, y)
	lu := float64(u - e.au)
	if lu < 0 || lu > e.length {
		return span{}, false
	}
	lv := float64(v - e.av)
	c, s, ok := e.centreNear(lu, lv, (corridorMaxHalfWidth+reach)*corridorMaxStretch)
	if !ok {
		return span{}, false
	}
	stretch := math.Sqrt(1 + math.Min(s*s, corridorMaxSlope*corridorMaxSlope))
	d := math.Abs(lv-c) / stretch
	if d > corridorMaxHalfWidth+reach {
		return span{}, false
	}
	return span{
		out:   d - e.halfWidth(lu),
		floor: corridorFloorMax + (corridorFloorMin-corridorFloorMax)*e.smooth01(12, lu, 700),
		wall:  corridorWallMin + 0.12*e.smooth01(13, lu, 520),
	}, true
}

// cellEdges calls fn for each link of the cell containing (x, y) that is
// present in the network: the cell's own east and south links, and the
// links coming in from the west and north.
func cellEdges(seed uint64, x, y int64, fn func(e *edge) bool) {
	ci, cj := x>>corridorShift, y>>corridorShift
	for _, c := range [4]struct {
		i, j int64
		h    bool
	}{{ci - 1, cj, true}, {ci, cj, true}, {ci, cj - 1, false}, {ci, cj, false}} {
		if LinkDropped(seed, c.i, c.j, c.h) {
			continue
		}
		e := newEdge(seed, c.i, c.j, c.h)
		if !fn(&e) {
			return
		}
	}
}

func nodeDistance(seed uint64, x, y int64) float64 {
	nx, ny := Node(seed, x>>corridorShift, y>>corridorShift)
	return math.Hypot(float64(x-nx), float64(y-ny))
}

// OnCorridor reports whether tile (x, y) is in the guaranteed-air core of
// the corridor network.
func OnCorridor(seed uint64, x, y int64) bool {
	if nodeDistance(seed, x, y) <= corridorNodeRadius {
		return true
	}
	found := false
	cellEdges(seed, x, y, func(e *edge) bool {
		if sp, ok := e.measure(x, y, 0); ok && sp.out <= 0 {
			found = true
		}
		return !found
	})
	return found
}

// carveCorridors lowers elevation h at tile (x, y) into the corridor
// valleys. rough is a small noise value that roughens the walls; the core
// band is always set to its floor, which is passable air.
func carveCorridors(seed uint64, x, y int64, h, rough float64) float64 {
	if h <= corridorFloorMin {
		return h // already lower than any corridor floor
	}
	wallAt := func(out, floor, wall float64) float64 {
		if out <= 0 {
			return floor
		}
		return floor + wall*out + rough*math.Min(1, out/4)
	}
	h = math.Min(h, wallAt(nodeDistance(seed, x, y)-corridorNodeRadius, -0.25, 0.07))
	reach := math.Min(corridorReach, (h-corridorFloorMin)/corridorWallMin)
	cellEdges(seed, x, y, func(e *edge) bool {
		if sp, ok := e.measure(x, y, reach); ok {
			h = math.Min(h, wallAt(sp.out, sp.floor, sp.wall))
		}
		return true
	})
	return h
}

// EachCorridorLine calls fn at points every step tiles along the centre line
// of every link that may pass through the box [x0, x1) x [y0, y1). It is for
// drawing the network when zoomed out, where testing tiles would miss it.
func EachCorridorLine(seed uint64, x0, y0, x1, y1 int64, step float64, fn func(x, y int64)) {
	step = math.Max(step, 0.5)
	cells := ((x1 - x0) >> corridorShift) * ((y1 - y0) >> corridorShift)
	if cells > 40000 {
		return // too far out for the network to be visible anyway
	}
	for j := y0>>corridorShift - 1; j <= y1>>corridorShift; j++ {
		for i := x0>>corridorShift - 1; i <= x1>>corridorShift; i++ {
			for _, h := range []bool{true, false} {
				if LinkDropped(seed, i, j, h) {
					continue
				}
				e := newEdge(seed, i, j, h)
				for lu := 0.0; lu <= e.length; lu += step {
					c, _ := e.centre(lu)
					fn(e.xy(e.au+int64(math.Round(lu)), e.av+int64(math.Round(c))))
				}
			}
		}
	}
}
