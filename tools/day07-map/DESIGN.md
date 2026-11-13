# Day 7 advanced map: design notes

This covers how the terrain is generated, how the corridor network makes every seed solvable, how the goal is chosen, how a solver would find the goal and then a route, and how hierarchical pathfinding handles a map this size. The code is in [`mapgen/`](./mapgen); how to run it is in the [README](./README.md).

## Terrain

`Elevation(seed, x, y)` returns a float in roughly [-1, 1]. `Height` multiplies it by 8 and rounds, so a tile is passable when its elevation is below 1/16. Every layer is keyed by `layer(seed, salt)`, so one seed drives everything.

**Precision.** Noise is 2D Perlin gradient noise on a lattice whose cell size is a power of two. A sample point is an `int64` tile plus a small float offset. Each octave splits the integer part into a lattice cell (an arithmetic shift, which is floor division) and a position inside the cell. Large coordinates are never turned into floats, so the map near 2^62 is as detailed as the map near 0 (`TestFarAway`).

The layers, from biggest to smallest:

1. **Domain warp.** Two low-frequency noise fields (cell size 1024, amplitude 180 tiles) displace the sample point for every layer below. This bends ranges and canyons into meanders instead of lattice-aligned blobs.
2. **Provinces.** Noise with an 8192-tile cell splits the world into **massifs**, high ground covering about half the map, and **lowlands**.
3. **Canyons.** These are the long, winding passable routes. Where a noise field crosses zero, `|n|` is small along thin, continuous, meandering curves. Two such families at different scales (cell sizes 512 and 256) cross each other and form a network. Inside a massif, everything except those bands is mountain, so the massif becomes a maze of canyons. A third, slow field varies the band width from 2–3 tile slots to broad valleys. The bands never end abruptly, so there are no dead-end stubs caused by the noise itself.
4. **Ranges.** Ridged noise (`1 - |n|` with a large 2048-tile cell) gives long, thin, winding chains of mountains across both lowlands and massifs, with snowy crests. Wherever a canyon crosses a range, the range is cut down to air. Those cuts are the **passes**, and they are the natural choke points a hierarchical solver will find as portals.
5. **Hills.** Medium noise rolls the lowland between -8 and 0 and pokes above 0 as scattered small mountains.
6. **Stamps.** The plane is cut into 512×512 cells. Each cell may hold one hand-shaped feature that fits inside it, so only one cell is checked per tile. The stamp is looked up through a weaker warp, so the shapes wobble:
   - **Crescents**: a disc with an offset disc bitten out of it, and a sheltered hollow between the horns.
   - **Craters**: a ring wall with one or two gaps and a bowl inside.
   - **Butte clusters**: 4–13 small round mountains.
   - **Basins**: deep open bowls that only change the colour.
7. **Corridors.** Carved last, over everything else. These make every seed solvable; the next section covers them.

**Shape of a typical map** (seed `north-pole`, 1M samples spread over 16M × 16M tiles): about 44% passable. The natural terrain is well connected but not fully. A flood fill over 1536×1536 windows finds 68–99% of the air in one 4-connected component (`TestConnectivity`). The rest is sealed pockets, such as canyon loops cut off by a range or the inside of a crater whose gaps open onto rock. These pockets are deliberate traps for solvers that assume everything connects. The corridor network is what guarantees a route between the start and the goal.

**Cost.** A `Height` call costs about 600 ns on one idle core, about 150 ns of it for the corridors. That's about 40 ms for a 256×256 chunk, or roughly 25 chunks per second per core.

## The corridor network

The plane is cut into 8192×8192 cells. Each cell has one **node** at a seed-chosen spot in the middle half of the cell. Nodes are joined to their east and south neighbours by **corridors**, and about one link in eight is left out so the network isn't a full grid. The network is connected by construction, so **every corridor tile can reach every other corridor tile**.

Corridors are meant to pass for natural valleys:

- **The centre line meanders.** Its sideways offset from the straight line between the nodes is a sum of six octaves of 1D gradient noise. They range from one or two big bends per cell (wavelength 3000 tiles, amplitude up to 1100) down to bends every hundred tiles and a wobble every dozen or so. The big octaves fade out towards the nodes, so the line meets them.
- **Width, depth and walls vary.** The guaranteed band is 3–12 tiles wide (half-width 1.6–6), and the floor sits at heights -1 to -4. Outside the band the terrain slopes down into the valley at a rate that changes along the corridor, from gentle valleys to steep gorges, and noise roughens the walls.
- **Corridors only lower the land.** Where the terrain is already low, a corridor leaves no mark. You only see one where it cuts through high ground, and there it looks like one more canyon.

The guarantees come from the shape. `mapgen/corridor.go` has the details and `corridor_test.go` checks them:

- **The graph stays connected with links dropped.** Picture the squares (faces) between four neighbouring nodes. Faces where i+j is even may drop one of their four links; odd faces never drop any. Every link borders one even and one odd face. A planar graph only falls apart when its removed edges form a cycle in the dual graph, and here every even face touches at most one removed link, so no cycle can form. Each dropped link keeps a three-link detour around its face, and every node keeps at least two links (`TestCorridorDrops`, `TestCorridorGraph`).
- **Each link is 4-connected.** An east link is the set of tiles within the half-width of the centre line, measured perpendicular to it. Measured vertically, that's `w·√(1+c′²)` with the slope capped at 8 in that correction. Each column holds at least 3 tiles. The vertical half-width also grows faster than the centre line can move between columns, so adjacent columns always share a tile, at any slope. South links swap x and y. `TestCorridorLinks` floods every link of 3×3 blocks of cells over its own band and reaches the far node, including near 2^43.
- **A tile only checks its own cell.** Nodes sit in the middle half of their cell and the centre line strays at most 1700 tiles from the straight line, so a link and its walls never leave the two cells it joins. `OnCorridor(seed, x, y)` checks the node disc and four links, and the octaves are evaluated largest first, stopping early once the line can't come close enough. Tiles already below every possible floor skip the corridors entirely.
- **Nothing can block a corridor.** Corridors are carved after the ranges and stamps, and the band is set to its floor, which is always passable (`TestCorridorPassable`).
- `Start(seed)` is the node of cell (0, 0) and `Goal(seed)` is another node, so both are always on the network.

At low zoom with `-corridors` on, the network shows as a loose, wandering mesh of about one link per cell side. Without the highlight, a corridor in a massif looks like one more canyon. The corridor code is public, so solvers can find them too; see below for why that's fine.

## The goal

### What the code does

- `Goal(seed)` picks a point at a seed-chosen angle and a seed-chosen distance between 2^18 and 2^19 tiles (262,144 to 524,288) from the start, then returns the corridor node of the cell containing that point. The goal can therefore land up to about one cell outside that range.
- The goal is a corridor node and so is the start. The network is connected, so **every seed has exactly one goal and a route to it always exists**, without organisers having to check anything (`TestGoal`, `TestCorridorConnected`).
- `IsGoal(seed, x, y)` tests one tile, and the `goal` command prints the start and goal.

For `north-pole` the start is (4620, 2206) and the goal is (322493, -86438), 330,002 tiles away.

### Known goal, or an extra-hard version

The goal comes straight from the seed, so anyone can get it immediately. That's deliberate:

- **Normal:** the challenge publishes the seed, the start and the goal, or solvers call `Goal(seed)`. The hard part is the route.
- **Extra hard:** solvers ignore `Goal` and find the goal by exploring outward from the start, asking `IsGoal` about each tile they visit. This is on the honour system: `IsGoal` is just a comparison with `Goal`, so nothing stops anyone from reading it.

A goal that truly can't be worked out from the seed is possible. An earlier version of this branch did it: the goal was the corridor tile with the smallest SHA-256 digest in a ring, solvers got only the digest, and finding the goal took hashing about 650 million tiles. It was dropped for simplicity. Even then, the search was a brute-force scan, not pathfinding, and a fully secret goal would need a server holding a key.

### What the corridors give away, and the answer to check

The corridor code is public, so a solver can follow the network from the start to the goal without looking at the terrain at all. That's a **valid but long** route. Corridors run along the coarse grid and meander, so the shortest route cuts across canyons and passes instead. A solver who only follows corridors gets a valid answer that is far from the shortest.

Open terrain always allows many routes, so the route itself can't be the unique answer. Some options for what to check:

- **A route, checked by a verifier.** Walk the submitted moves from the start with `Height`, and confirm every step is air and the walk ends on the goal. A route of a few hundred thousand steps checks in well under a second. Report the length, so shorter routes rank higher.
- **The shortest route length.** Unique, but organisers would need an exact solver at a scale of hundreds of thousands of tiles. That's a big job, so treat it as a stretch goal.

**Recommendation:** ask for a route, check it with a verifier, and rank routes by length.

### Two passes for a solver

1. **Find the goal.** Normally that's just `Goal(seed)`. In the extra-hard version, explore outward chunk by chunk from the start and test the tiles you generate with `IsGoal`. The chunk-level search below works for this, and the chunk summaries it builds carry over to pass 2.
2. **Find a route.** Run the hierarchical search below between the start and the goal. The corridors give a guaranteed fallback route and an upper bound on the length, which helps prune the search.

## Why naive search fails, and what to do instead

### Memory needed by flat search

The goal for `north-pole` is about 330,000 tiles away. A BFS or DFS from the start explores roughly a disc of that radius before it reaches the goal: π × (3.3 × 10^5)² × 0.44 ≈ **1.5 × 10^11 air tiles**. The memory needed:

| Representation                                                         | Memory                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hash set of visited tiles (≥16 bytes per tile, before parent pointers) | **≥ 2.4 TB**                                                              |
| Dense visited bitmap over the 660k × 660k bounding square              | 4.4 × 10^11 bits ≈ **54 GB**                                              |
| A\* with Manhattan heuristic                                           | Depends on the maze. Even 1% of the BFS disc is about 24 GB in a hash map |

A goal at the far end of the range is about 524,000 tiles out, which makes every number about 2.5× bigger: a 6 TB hash set or a 137 GB bitmap. So flat search is past 4 GB in every form, and a plain hash-map BFS is past 1 TB. A determined solver with a bit-packed visited set could fit a flat BFS on a large disk, but not in RAM. Doubling `GoalMinDistance` and `GoalMaxDistance` makes every number 4× bigger.

### Hierarchical pathfinding (HPA\*-style)

1. **Chunks.** Split the plane into C×C chunks (C = 256 is a good size). Chunk `(cx, cy)` covers tiles `[cx·C, (cx+1)·C) × [cy·C, (cy+1)·C)`. Generate a chunk only when needed: 65,536 `Height` calls, or 8 KB as a bitmap.
2. **Portals.** On each edge shared by two chunks, find the maximal runs of tiles that are air on both sides. Each run is an entrance. Put one portal node in the middle of each run, or two nodes at its ends when the run is long. Canyons and passes become a handful of portals per edge, and solid rock gives none.
3. **Intra-chunk edges.** Inside each chunk, run BFS from every portal to find which of the chunk's other portals it reaches and at what distance. This is where 4-direction-only movement matters: the BFS must not step diagonally. Store the result as a small table (portals × portals distances). This is the chunk's **summary**, typically a few hundred bytes. Portals that reach nothing in the chunk are pruned.
4. **Abstract graph.** Nodes are portals. Edges are the intra-chunk distances, plus cost-1 edges that cross a chunk border between paired portals. Insert the start and goal as temporary nodes connected to the portals of their own chunks.
5. **Search the abstract graph** with A\* (Manhattan heuristic, which stays admissible on the abstract graph). Build summaries **lazily**: when A\* first expands a portal on a chunk edge, generate the neighbouring chunk and summarise it.
6. **Refine.** For each consecutive pair of portals on the abstract path, rerun a small BFS inside that chunk to recover the actual tile path. Concatenate the pieces and compress them into the day 7 output format (`2N27E5S`).

**Optimality.** HPA\* paths are near-optimal, typically within a few percent, because each run gets a single portal. Placing portals at both ends of long runs and smoothing the refined path closes most of the gap. If exact optimality matters, use the abstract distances as a strong heuristic for a final A\* restricted to the corridor of chunks along the abstract path.

**More levels.** For goals millions of tiles away, add a second level. Group 16×16 chunks into a super-chunk, compute super-portals from the level-1 graph, and search there first. Each level divides the number of nodes A\* touches by roughly the group size.

### Memory bounds and storing explored chunks on disk

- **In RAM:** the A\* open and closed sets over portals, plus an LRU cache of chunk bitmaps (8 KB each). A band of chunks about 1,300 long (330,000 / 256) by about 200 wide is about 260k chunk summaries. At about 0.5 KB each that's around 130 MB, and the summaries can be evicted too.
- **On disk:** store summaries keyed by `(seed, cx, cy)` in a simple append-only file or a key-value store such as bbolt or SQLite. Because chunks are pure functions of the seed, any summary can be thrown away and recomputed, so the cache is just an optimisation, never a source of truth. Both passes, reruns and threads share it.
- **Time:** about 37 ms to generate a chunk on one core. 260k chunks take about 2.7 core-hours, or about 13 minutes on 12 cores. Chunks are independent, so this parallelises perfectly. A goal at the far end of the range roughly doubles that. That cost is why the goal is 2^18–2^19 tiles away and not further.
- **Faster chunks** (optional, for the solver): a chunk generator can evaluate the low-frequency layers once per lattice cell instead of once per tile. `Height` itself stays the reference, and the results must match it bit for bit.
