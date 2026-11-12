# Day 7 advanced map: generator and viewer

This is a procedural map generator and terminal viewer for a planned "advanced" version of day 7, Buddy's PathFinder. The map is far too big to store or to search naively. It is never stored as data: every tile is computed on demand from one seed.

This folder is a standalone Go module. It is not part of the Astro site build. For how the terrain is built, how the goal works, and how a solver would handle a map this size, see [DESIGN.md](./DESIGN.md).

## The rules the generator guarantees

- `mapgen.Height(seed, x, y)` is a pure function of a `uint64` seed and `int64` coordinates. It never looks at neighbouring tiles, so any tile anywhere in the 2^64 × 2^64 plane can be queried directly. The terrain is equally detailed at `(0, 0)` and at `(2^62, -2^62)`, because large coordinates are never converted to floating point.
- Heights run from **-8 to 8**. A height of **0 or less is passable air**; **1 or more is mountain**. The height only matters for drawing nicer maps.
- **Movement is 4-directional** (north, east, south, west). Two air tiles that touch only at a corner are _not_ connected. There is no diagonal movement and no squeezing between mountains.
- North is `-y`, the top of the screen, as in the original day 7.
- The same seed always gives the same map. `TestGolden` pins a checksum, so an accidental change to the generator fails the tests.

```go
import "wcf/day07-map/mapgen"

h := mapgen.Height(seed, x, y)     // -8..8
ok := mapgen.Passable(seed, x, y)  // h <= 0
sx, sy := mapgen.Start(seed)       // first passable tile spiralling out from (0, 0)
r := mapgen.GoalRegion(seed)       // public 4096x4096 square about 2^20 tiles away
g := mapgen.IsGoal(seed, x, y)     // the goal test; see DESIGN.md
```

## Running it

You need Go 1.23 or newer. From this folder:

```bash
go run . -seed north-pole
```

If Go isn't installed, the official container works too. Run this from the repository root:

```bash
podman run --rm -it -v "$PWD/tools/day07-map":/src -w /src docker.io/library/golang:1.25 go run . -seed north-pole
```

Commands:

| Command                    | What it does                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `day07-map [view]`         | Interactive viewer (the default)                                                                                                                |
| `day07-map dump`           | Prints one frame to stdout. Use `-style shade`, `-style ox` (O/X like day 7) or `-style color`                                                  |
| `day07-map png -o map.png` | Renders a frame to a PNG (`-w`, `-h`, `-scale`)                                                                                                 |
| `day07-map scan`           | Brute-forces the goal region and lists the goal tiles (about 50 ms). It also flood-fills around the start and each goal to catch sealed pockets |
| `day07-map scan -find 100` | Tries 100 numeric seeds and lists the ones with exactly one goal tile                                                                           |
| `day07-map stats`          | Passable fraction, height histogram and time per `Height()` call                                                                                |
| `go test ./...`            | Determinism, golden checksum, far-coordinate and connectivity tests                                                                             |

Every map command takes `-seed` (a number or any string; strings are hashed), `-x` and `-y` (the centre tile; defaults to the start), and `-zoom` (tiles per pixel, a power of two).

### Viewer keys

| Key                                            | Action                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| arrows, `w` `a` `s` `d`, `h` `j` `k` `l`       | Pan 4 pixels                                                       |
| Shift+arrows, `W` `A` `S` `D`, `H` `J` `K` `L` | Pan half a screen                                                  |
| `f`                                            | Toggle fast pan, so the normal pan keys move half a screen         |
| `+` / `z`, `-` / `x`                           | Zoom in or out (1 to 2^20 tiles per pixel)                         |
| `m`                                            | Cycle the drawing mode: colour half blocks, ASCII shades, O/X      |
| `o` / `0`                                      | Jump to the start                                                  |
| `g`                                            | Jump to the goal, or to the goal region while it is still scanning |
| `?`                                            | Show or hide the help lines                                        |
| `q`                                            | Quit                                                               |

The status line shows the seed, the centre tile with its height, the zoom, the mode, the goal scan result and the frame time. The default mode draws two square pixels per character cell with `▀` and 24-bit colour, so use a truecolor terminal. Use `m` for plain ASCII. The start is red, the goal region outline is yellow and the goal tile is magenta.

When zoomed out, each pixel samples up to 4×4 tiles. A pixel counts as mountain when most samples are mountain, so the passable/impassable split stays honest at every zoom.

## Gallery (seed `north-pole`)

Zoom 1:128, centred on the start. Massifs (brown) cover about half the map. Open lowlands (green and blue) are scattered with small mountains.

![Overview at zoom 1:128](docs/overview-z128.png)

Zoom 1:4: the edge of a massif. Canyons wind through it, a long range with snowy peaks runs along it, and crescents, craters and butte clusters are stamped on the lowland.

![Massif edge at zoom 1:4](docs/massif-edge-z4.png)

Zoom 1:1 inside a massif. The only ways through are canyons, which vary from 2–3 tile slots to broad valleys.

![Canyons at zoom 1:1](docs/canyons-z1.png)

Zoom 1:2 on the lowland: a crescent and scattered small mountains.

![Lowland and crescent at zoom 1:2](docs/lowland-crescent-z2.png)

A canyon junction from the image above as an O/X capture at zoom 1:2, in the original day 7 style (`dump -style ox -x -1000 -y -550 -zoom 2 -w 100 -h 15`):

```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXXXXXXXOOOOOOOOOXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOXXXXXXXXOOOOOOOOOOOOOOOOOXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXXXXXOOOOOOOOOOOOOOOOOOOOOOXXXXXXXOOOOOOOOOOOOOOOOOOOOOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOXXXOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXOOOOOOOOOOOOOOOXXXXXXOOOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOXOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXOOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXOOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXXXOO
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOXXXXXXXXXXXXXXXXXXXXXXOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXXXXXO
```

The goal for `north-pole` is at (1009734, -285247), about 1.05 million tiles from the start. Here it is at zoom 1:8, ringed in magenta. It sits in a hollow on the edge of a massif, reached through canyons. The yellow line is the top edge of the goal region:

![Goal area at zoom 1:8](docs/goal-z8.png)

The same spot as shaded ASCII at zoom 1:4 (`dump -x 1009734 -y -285247 -zoom 4 -w 90 -h 18`). A space is low air, `.` and `,` are air close to the limit, `+` is a low mountain, `#` is higher, and `E` is the goal. The `+` block on the left is the massif's flank:

```
.,+#######++++++++++++++++++++        #                               #  #+###############
.+++#######++++++++++++++++++++           #                           ##   ###+  +  +#####
,+++#####++++++++++++++++++++++                                   +   ##  #####  #+#######
++++######+++++++++++++++++++++                       +     +  #      #   #+   +   +######
+++++###++++++++++++++++++++++++                     +    +   ####  #     ###    #########
++++++++++++++++++++++++++++++++                 #   + ++     #  # +#        + ## ##+#####
++++++++++++++++++++++++++++++++                    ####         ###          +   # +#####
+++++++++++++++++++++++++++++++++                        ###+####### #  #           +#####
.++++++++++++++++++++++++++++++++                     + +### ##+#+##  #     +       +#####
.,++++++++++++++++++++++++++++++++           E        ++     +######  ##    #       +#####
 .,+++++++++++++++++++++++++++++++                               # ##  ###+        ++#####
. .,+++++++++++++++++++++++++++++++                                  +            ++######
.  .++++++++++++++++++++++++++++++++                                   +       ## ++######
.. .,+++++++++++++++++++++++++++++++                                         #  ++++######
 .. .,+++++++++++++++++++++++++++++++                                       ##+   ++######
. .  .,+++++++++++++++++++++++++++++++                                            +#######
,    .,,+++++++++++++++++++++++++++++++                                           +#######
,,    .+++++++++++++++++++++++++++++++++                                         +########
```
