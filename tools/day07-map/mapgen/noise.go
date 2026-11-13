package mapgen

import "math"

// All noise in this package is evaluated on an integer lattice addressed by
// int64 coordinates. Large coordinates are never converted to float64: a
// sample point is an integer tile plus a small fractional offset, and each
// octave splits the integer part into a lattice cell (by an arithmetic shift)
// and a position inside that cell. That keeps the terrain identical in detail
// at (0, 0) and at (2^62, -2^62).

// point is a sample position: an integer tile plus a fractional offset.
// After normalisation fx and fy are in [0, 1).
type point struct {
	x, y   int64
	fx, fy float64
}

func pt(x, y int64) point { return point{x: x, y: y} }

// add offsets the point by a (small) float displacement and renormalises.
func (p point) add(dx, dy float64) point {
	fx := p.fx + dx
	fy := p.fy + dy
	ix := math.Floor(fx)
	iy := math.Floor(fy)
	return point{x: p.x + int64(ix), y: p.y + int64(iy), fx: fx - ix, fy: fy - iy}
}

// mix is the splitmix64 finaliser: a fast, well-distributed 64-bit mixer.
func mix(h uint64) uint64 {
	h ^= h >> 30
	h *= 0xbf58476d1ce4e5b9
	h ^= h >> 27
	h *= 0x94d049bb133111eb
	h ^= h >> 31
	return h
}

// hash2 hashes a seed with two lattice coordinates.
func hash2(seed uint64, x, y int64) uint64 {
	h := mix(seed ^ (uint64(x) * 0x9e3779b97f4a7c15))
	return mix(h ^ (uint64(y) * 0xc2b2ae3d27d4eb4f) ^ 0x632be59bd9b4e019)
}

// unit maps a hash to a float64 in [0, 1).
func unit(h uint64) float64 { return float64(h>>11) / (1 << 53) }

// 16 evenly spaced unit gradients.
var grads [16][2]float64

func init() {
	for i := range grads {
		a := 2 * math.Pi * float64(i) / float64(len(grads))
		grads[i] = [2]float64{math.Cos(a), math.Sin(a)}
	}
}

func fade(t float64) float64 { return t * t * t * (t*(t*6-15) + 10) }

func lerp(a, b, t float64) float64 { return a + (b-a)*t }

// gradient is 2D Perlin gradient noise with a lattice cell size of 2^shift
// tiles. The result is roughly in [-1, 1].
func gradient(seed uint64, p point, shift uint) float64 {
	size := float64(int64(1) << shift)
	mask := int64(1)<<shift - 1
	cx := p.x >> shift // arithmetic shift == floor division
	cy := p.y >> shift
	tx := (float64(p.x&mask) + p.fx) / size
	ty := (float64(p.y&mask) + p.fy) / size

	g := func(ix, iy int64, dx, dy float64) float64 {
		v := grads[hash2(seed, ix, iy)&15]
		return v[0]*dx + v[1]*dy
	}
	n00 := g(cx, cy, tx, ty)
	n10 := g(cx+1, cy, tx-1, ty)
	n01 := g(cx, cy+1, tx, ty-1)
	n11 := g(cx+1, cy+1, tx-1, ty-1)
	u := fade(tx)
	v := fade(ty)
	return 1.4142 * lerp(lerp(n00, n10, u), lerp(n01, n11, u), v)
}

// fbm sums octaves of gradient noise, starting at a cell size of 2^shift and
// halving it each octave. The result is roughly in [-1, 1].
func fbm(seed uint64, p point, shift uint, octaves int) float64 {
	sum, amp, norm := 0.0, 1.0, 0.0
	for i := 0; i < octaves && shift >= 1; i++ {
		sum += amp * gradient(seed+uint64(i)*0x51ed27, p, shift)
		norm += amp
		amp *= 0.5
		shift--
	}
	return sum / norm
}

func smoothstep(e0, e1, x float64) float64 {
	t := (x - e0) / (e1 - e0)
	if t <= 0 {
		return 0
	}
	if t >= 1 {
		return 1
	}
	return t * t * (3 - 2*t)
}
