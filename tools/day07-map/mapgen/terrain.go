// Package mapgen generates the Buddy Pathfinder "advanced" map: an effectively
// unbounded grid of tiles computed on demand from a single seed.
//
// Every function here is pure. Height(seed, x, y) depends only on its
// arguments, never on neighbouring tiles or on anything computed earlier, so
// any tile anywhere in the int64 plane can be queried directly.
//
// Every seed is solvable: the start and the goal are both nodes of a
// corridor network that is connected by construction (see corridor.go).
//
// Heights run from -8 to 8. A height of 0 or less is passable air; 1 or more is
// mountain. Movement is 4-directional (N, E, S, W): two passable tiles that
// touch only at a corner are not connected.
package mapgen

import "math"

const (
	MinHeight = -8
	MaxHeight = 8
)

// Layer salts. Changing any of these changes every map.
const (
	saltWarpX uint64 = iota + 1
	saltWarpY
	saltProvince
	saltRange
	saltCanyonA
	saltCanyonB
	saltCanyonWidth
	saltHills
	saltDetail
	saltStamp
	saltGoal
)

func layer(seed, salt uint64) uint64 { return mix(seed ^ mix(salt*0x9e3779b97f4a7c15)) }

// Passable reports whether a tile is air (height 0 or less).
func Passable(seed uint64, x, y int64) bool { return Height(seed, x, y) <= 0 }

// Height returns the terrain height of tile (x, y) in [-8, 8].
func Height(seed uint64, x, y int64) int {
	h := math.Round(Elevation(seed, x, y) * 8)
	if h < MinHeight {
		return MinHeight
	}
	if h > MaxHeight {
		return MaxHeight
	}
	return int(h)
}

// Elevation is the continuous field behind Height, roughly in [-1, 1]. Height
// is Elevation*8 rounded, so a tile is passable when Elevation < 1/16.
func Elevation(seed uint64, x, y int64) float64 {
	p := pt(x, y)

	// Domain warp: bend the whole plane so ranges and canyons meander instead
	// of following the noise lattice.
	wx := fbm(layer(seed, saltWarpX), p, 10, 3)
	wy := fbm(layer(seed, saltWarpY), p, 10, 3)
	q := p.add(wx*180, wy*180)

	// Provinces: a very low-frequency field. High values are mountain massifs
	// cut by canyons; low values are open lowlands with hills and lone ranges.
	province := fbm(layer(seed, saltProvince), q, 13, 3)
	massif := smoothstep(-0.12, 0.08, province)

	hills := fbm(layer(seed, saltHills), q, 7, 3)
	detail := gradient(layer(seed, saltDetail), p, 3)

	// Canyons: the thin bands where a noise field crosses zero. Two families
	// at different scales cross each other and form a winding network. The
	// band width itself varies, from 2-3 tile slots to broad valleys.
	widthMod := 0.5 + 0.5*fbm(layer(seed, saltCanyonWidth), q, 11, 2)
	ca := math.Abs(fbm(layer(seed, saltCanyonA), q, 9, 3)) / (0.012 + 0.05*widthMod)
	cb := math.Abs(fbm(layer(seed, saltCanyonB), q, 8, 2)) / (0.015 + 0.04*widthMod)
	canyon := smoothstep(0, 1, math.Min(ca, cb)) // 0 in a canyon floor, 1 away

	// Ranges: ridged noise (1-|n|) at a large scale gives long, thin, winding
	// chains of mountains. Canyons that cross a range become its passes.
	rn := math.Abs(fbm(layer(seed, saltRange), q, 11, 3))
	ridge := smoothstep(0.075, 0.0, rn) // 1 on the crest, 0 off the range
	ridge *= smoothstep(-0.55, -0.2, province)

	// Lowland base: gently rolling, mostly negative, with hills that poke
	// above zero as small mountains.
	low := -0.45 + 0.55*hills + 0.08*detail
	if hills > 0.22 {
		low += (hills - 0.22) * 2.6
	}

	// Massif base: high ground everywhere except the canyon floors.
	high := 0.45 + 0.4*math.Abs(hills) + 0.08*detail
	high = lerp(-0.35+0.1*detail, high, canyon)

	h := lerp(low, high, massif)

	// Add ranges on top, cut by canyon passes.
	rh := ridge * (0.55 + 0.35*math.Abs(hills)) * smoothstep(0.15, 0.7, canyon)
	if rh > 0 {
		h = math.Max(h, h*0.3+rh)
	}

	// Stamped shapes (crescents, craters, butte clusters, basins).
	h = stamps(seed, p.add(wx*40, wy*40), h)

	// The corridor network is carved last so nothing can block it. Its core
	// floor is at most -0.07, which rounds to a passable height.
	return carveCorridors(seed, x, y, h, 0.07*detail)
}

// stamps overlays at most one hand-shaped feature per 512x512 cell. Each
// stamp is placed so it fits inside its cell, so only the cell containing the
// sample point needs to be considered.
func stamps(seed uint64, p point, h float64) float64 {
	const shift = 9
	const size = 1 << shift
	cx, cy := p.x>>shift, p.y>>shift
	lx := float64(p.x-cx<<shift) + p.fx // position inside the cell
	ly := float64(p.y-cy<<shift) + p.fy

	r := hash2(layer(seed, saltStamp), cx, cy)
	next := func() float64 { r = mix(r + 0x9e3779b97f4a7c15); return unit(r) }

	kind := next()
	switch {
	case kind < 0.22: // crescent: a disc with an offset disc bitten out
		R := 40 + 140*next()
		ox, oy := R+(size-2*R)*next(), R+(size-2*R)*next()
		a := 2 * math.Pi * next()
		bite := 0.25 + 0.2*next()
		ix, iy := ox+math.Cos(a)*R*bite, oy+math.Sin(a)*R*bite
		inner := R * (0.82 + 0.08*next())
		next2 := next()
		d0 := math.Hypot(lx-ox, ly-oy)
		d1 := math.Hypot(lx-ix, ly-iy)
		if d0 < R && d1 > inner {
			edge := math.Min(R-d0, d1-inner)
			v := 0.2 + (0.2+0.25*next2)*smoothstep(0, 12, edge)
			h = math.Max(h, v)
		} else if d1 <= inner && d0 < R && h < 0.3 {
			h = math.Min(h, -0.35) // sheltered hollow inside the horns
		}
	case kind < 0.32: // crater: a ring wall with one or two gaps
		R := 25 + 70*next()
		ox, oy := R+8+(size-2*R-16)*next(), R+8+(size-2*R-16)*next()
		th := 3 + 5*next()
		g1 := 2 * math.Pi * next()
		g2 := g1 + math.Pi*(0.6+0.8*next())
		gaps := 1 + int(next()*2)
		gw := (6 + 6*next()) / R // gap half-width in radians
		d := math.Hypot(lx-ox, ly-oy)
		if math.Abs(d-R) < th {
			a := math.Atan2(ly-oy, lx-ox)
			inGap := angDist(a, g1) < gw || (gaps == 2 && angDist(a, g2) < gw)
			if !inGap {
				h = math.Max(h, 0.4+0.4*smoothstep(th, 0, math.Abs(d-R)))
			}
		} else if d < R-th && h < 0.3 {
			h = math.Min(h, -0.75+0.4*(d/R))
		}
	case kind < 0.44: // butte cluster: scattered small round mountains
		n := 4 + int(next()*10)
		ox, oy := 100+(size-200)*next(), 100+(size-200)*next()
		for i := 0; i < n; i++ {
			bx := ox + (next()-0.5)*160
			by := oy + (next()-0.5)*160
			br := 3 + 9*next()
			d := math.Hypot(lx-bx, ly-by)
			if d < br {
				h = math.Max(h, 0.3+0.5*smoothstep(br, 0, d))
			}
		}
	case kind < 0.52: // basin: a deep, open bowl (only affects colour)
		R := 30 + 120*next()
		ox, oy := R+(size-2*R)*next(), R+(size-2*R)*next()
		d := math.Hypot(lx-ox, ly-oy)
		if d < R && h < 0.3 {
			h = math.Min(h, lerp(-1, h, smoothstep(0, R, d)))
		}
	}
	return h
}

func angDist(a, b float64) float64 {
	d := math.Mod(math.Abs(a-b), 2*math.Pi)
	if d > math.Pi {
		d = 2*math.Pi - d
	}
	return d
}
