# Day 7 advanced map: design notes

This covers how the terrain is generated, how the corridor network makes every seed solvable, how the goal is chosen so it is unique but can't be worked out from the seed, how a solver would find the goal and then a route, and how hierarchical pathfinding handles a map this size. The code is in [`mapgen/`](./mapgen); how to run it is in the [README](./README.md).

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

**Cost.** A `Height` call costs about 570 ns on one core, about 120 ns of it for the corridor check. That's about 37 ms for a 256×256 chunk, or roughly 27 chunks per second per core.

## The corridor network

The plane is cut into 8192×8192 cells. Each cell has one **node** at a seed-chosen spot in the middle half of the cell. Every node is joined to its east and south neighbours (and so to all four) by a **corridor**: a band of air at least 3 tiles thick that wiggles sideways around the straight line between the two nodes. A disc of radius 4 around each node joins the ends of its four corridors. A grid in which every node links to its neighbours is connected, so **every corridor tile can reach every other corridor tile**.

The guarantees come from the shape. `mapgen/corridor.go` has the details and `corridor_test.go` checks them:

- The wiggle is a sum of two sine waves times `sin(πt)`, so it is zero at both nodes. Its amplitude is scaled from the frequencies so the slope is at most 0.9, which keeps the band at least 2·2/√(1+0.81) ≈ 3 tiles thick at any angle. That's enough to stay 4-connected (`TestCorridorConnected` floods 3×3 blocks of cells using corridor tiles only and reaches every node, including at coordinates near 2^43).
- The wiggle is at most about 0.11 cells, and nodes sit in the middle half of their cell, so a corridor never leaves the two cells it joins. `OnCorridor(seed, x, y)` therefore only has to check the node disc and four corridors of the tile's own cell, which keeps it a cheap, pure function.
- Corridors are carved after the ranges and stamps, by capping elevation at -0.2 (height -2). Nothing can block them (`TestCorridorPassable`).
- `Start(seed)` is the node of cell (0, 0), so the start is always on the network.

Without the highlight, corridors look like any other narrow canyon. At low zoom with `-corridors` on, their grid layout is plain to see. The corridor code is public, so solvers can find them too; see below for why that's fine.

## The goal

### What the code does

- **Candidates** are corridor tiles whose distance from the start is in [2^18, 2^19), between 262,144 and 524,288 tiles. For `north-pole` there are about 646 million of them.
- Every candidate gets a **SHA-256 digest** of `"wcfday07" ‖ seed ‖ x ‖ y`. The **goal is the candidate with the smallest digest.**
- Solvers get the seed and the goal digest, a 64-character hex string. `IsGoal(seed, digest, x, y)` is true when the tile is a candidate and its digest equals the published one.
- `FindGoal` (and the `scan` command) walks every corridor tile in the ring, hashes it and keeps the smallest. Organisers run it once per seed to get the digest to publish. It takes about 20 s on an idle 12-core machine, or about 4 CPU-minutes.

For `north-pole` the goal is at (-117825, -254570), 284,476 tiles from the start, with digest `0000000d977a6440d8d0288e30f21e9bd6c2799dc7b8030f2a68322d0837babb`.

### Why every seed has exactly one goal, and it is reachable

- **Exactly one.** The minimum of a set of distinct SHA-256 digests is unique. Two candidates would need the same digest, which is a SHA-256 collision; nobody has ever found one. So every seed has exactly one goal tile and `IsGoal` is true for exactly one tile (`TestGoalUnique`).
- **Reachable.** The goal is a corridor tile and the start is a corridor node. The network is connected, so a route always exists, and every seed works without organisers having to check it.

### Why the goal can't be worked out from the seed

- **No shortcut through the hash.** Knowing the digest doesn't tell you the tile, because SHA-256 can't be run backwards. The only way to find the goal is to hash candidates until one matches. That means visiting the corridor network across the whole ring: about 650 million tiles, done chunk by chunk or edge by edge.
- **The hash has to be cryptographic.** The fast mixer the terrain uses is invertible. With it, a solver could pick any `x`, solve for the matching `y` and skip almost all the work. SHA-256 rules that out.
- **Nothing points the way.** The seed decides the node positions and corridor shapes, but nothing about it hints at which corridor in which part of the ring holds the smallest digest.
- **What this can't do.** Any goal a solver can test locally can be found by testing every candidate. This design makes that test the only shortcut and makes it cost real work. It still isn't a secret: a determined solver will find the goal in tens of seconds of CPU time. Truly hiding it would need a server holding a secret key, so solvers query `isGoal(x, y)` over the network. That can't be checked offline and rate limits fight honest exploration, so it isn't worth it here.

### What the corridors give away, and the answer to check

The corridor code is public, so a solver can follow the network from the start to the goal without looking at the terrain at all. That's a **valid but long** route. Corridors run along the coarse grid and meander, so the shortest route cuts across canyons and passes instead. A solver who only follows corridors gets a valid answer that is far from the shortest.

"Exactly one valid solution" fits the goal, not the route: open terrain always allows many routes. Some options for what to check:

- **Goal coordinates.** Unique, and works with the site's existing hash-based answer checker. This tests pass 1.
- **A route, checked by a verifier.** Walk the submitted moves from the start with `Height`, and confirm every step is air and the walk ends on the goal. A route of a few hundred thousand steps checks in well under a second. Report the length, so shorter routes rank higher.
- **The shortest route length.** Also unique, but organisers would need an exact solver at a scale of hundreds of thousands of tiles. That's a big job, so treat it as a stretch goal.

**Recommendation:** publish the seed, the goal digest and the ring. Ask for the goal coordinates plus a route, checked by a verifier. Rank routes by length.

### Two passes for a solver

1. **Find the goal.** Enumerate the corridor tiles in the ring, either straight from the corridor formula or by exploring chunk by chunk, and hash each one until `IsGoal` is true. This touches about 650 million tiles but needs no terrain and almost no memory.
2. **Find a route.** Run the hierarchical search below between the start and the now-known goal. The corridors give a guaranteed fallback route and an upper bound on the length, which helps prune the search.

## Why naive search fails, and what to do instead

### Memory needed by flat search

The goal for `north-pole` is about 284,000 tiles away. A BFS or DFS from the start explores roughly a disc of that radius before it reaches the goal: π × (2.84 × 10^5)² × 0.44 ≈ **1.1 × 10^11 air tiles**. The memory needed:

| Representation                                                         | Memory                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hash set of visited tiles (≥16 bytes per tile, before parent pointers) | **≥ 1.8 TB**                                                              |
| Dense visited bitmap over the 569k × 569k bounding square              | 3.2 × 10^11 bits ≈ **40 GB**                                              |
| A\* with Manhattan heuristic                                           | Depends on the maze. Even 1% of the BFS disc is about 18 GB in a hash map |

A goal at the outer edge of the ring is 524,288 tiles out, which makes every number about 3.4× bigger: a 6 TB hash set or a 137 GB bitmap. So flat search is past 4 GB in every form, and a plain hash-map BFS is past 1 TB. A determined solver with a bit-packed visited set could fit a flat BFS on a large disk, but not in RAM. Doubling `RingMin` and `RingMax` makes every number 4× bigger.

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

- **In RAM:** the A\* open and closed sets over portals, plus an LRU cache of chunk bitmaps (8 KB each). A band of chunks about 1,100 long (284,000 / 256) by about 200 wide is about 220k chunk summaries. At about 0.5 KB each that's around 110 MB, and the summaries can be evicted too.
- **On disk:** store summaries keyed by `(seed, cx, cy)` in a simple append-only file or a key-value store such as bbolt or SQLite. Because chunks are pure functions of the seed, any summary can be thrown away and recomputed, so the cache is just an optimisation, never a source of truth. Pass 2 reruns and threads share it.
- **Time:** about 37 ms to generate a chunk on one core. 220k chunks take about 2.3 core-hours, or about 12 minutes on 12 cores. Chunks are independent, so this parallelises perfectly. A goal at the outer edge of the ring roughly doubles that. That cost is why the ring is 2^18–2^19 and not further out.
- **Faster chunks** (optional, for the solver): a chunk generator can evaluate the low-frequency layers once per lattice cell instead of once per tile. `Height` itself stays the reference, and the results must match it bit for bit.
