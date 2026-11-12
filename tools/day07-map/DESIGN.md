# Day 7 advanced map: design notes

This covers how the terrain is generated, how the goal works and how far it can really be hidden, how a solver would find the goal and then a route, and how hierarchical pathfinding handles a map this size. The code is in [`mapgen/`](./mapgen); how to run it is in the [README](./README.md).

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

**Shape of a typical map** (seed `north-pole`, 1M samples spread over 16M × 16M tiles): about 44% passable. A flood fill over 1536×1536 windows finds 68–99% of the air in one 4-connected component (`TestConnectivity`). The rest is sealed pockets, such as canyon loops cut off by a range or the inside of a crater whose gaps open onto rock. These pockets are deliberate traps for solvers that assume everything connects.

**Cost.** A `Height` call costs about 400 ns on one core. That's about 26 ms for a 256×256 chunk, or roughly 40 chunks per second per core.

## The goal

### What the code does

- `GoalRegion(seed)` is a **public** 4096×4096 square. Its centre is 2^20 tiles (about 1.05 million) from the origin, in a direction taken from the seed.
- `IsGoal(seed, x, y)` is true when the tile is inside that region, has height -2 or lower (open lowland, which is rarely sealed), and passes a keyed hash test: `H(key, x, y) < threshold`. The threshold is tuned so the expected number of goal tiles in the region is about one.
- The count for a given seed is not guaranteed. It follows a Poisson distribution with a mean near 1, so about 37% of seeds have exactly one goal tile. `scan -find N` lists such seeds, and organisers pick one. `north-pole` has exactly one goal, at (1009734, -285247).

### What is actually feasible

You can't hide the goal from someone who can evaluate the goal rule. Any rule the solver can check locally, they can also check everywhere without walking. Exploring outward from the start costs at least as much as scanning the same area. So a locally checkable goal can't force anyone to pathfind in order to find it. The best it can do is make finding it cost a scan.

Here is what each option really gives:

| Approach                                                                                                       | Can a solver compute the goal without searching?                                                                     | Practical?                                                 |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Goal derived from the seed (for example, hash the seed to coordinates)                                         | Yes, instantly                                                                                                       | Yes, but not hidden at all                                 |
| Keyed hash test on tiles in a known region (implemented)                                                       | Only by scanning the region. For 4096² tiles that takes about 50 ms because the hash runs before `Height`            | Yes. It's a warm-up, not a secret                          |
| The same test over a much larger or unknown region                                                             | The scan grows with the region. It also defeats the organisers, who need the scan to check there is exactly one goal | Somewhat. Cost is symmetric for organisers and solvers     |
| Goal keyed by a secret that solvers don't get, behind a server oracle (`isGoal(x, y)` over HTTP, rate-limited) | No. This is the only truly uncheatable option                                                                        | Needs a server, and rate limits fight honest exploration   |
| Secret key compiled into a binary or WASM blob                                                                 | Not easily, but it is obfuscation, not security. Extract the key and you're back to scanning                         | Possible, but not worth it                                 |
| Many candidate goals, only one reachable from the start                                                        | Candidates come from a scan, but telling which one is reachable takes real pathfinding                               | Yes, if organisers run a reference solver to pick the seed |

**Recommendation:** publish the **start and goal coordinates** in the challenge text. This is the honest fallback. The hard part of the challenge is the route, not the search. The goal region and `IsGoal` can stay as an optional first step, or the "many candidates, one reachable" variant can be used if the organisers are willing to run a reference solver once per seed to verify it. Either way, the organisers must verify that start and goal are connected. `scan` only checks that each one escapes a 1024-tile radius, which rules out small sealed pockets. Proving the full connection needs the solver this work leaves out.

### Two passes for a solver

1. **Find the goal.** With the published region, scan it with `IsGoal`. That's 16.7M cheap hash checks. Without a published region (the hidden variant), explore outward chunk by chunk from the start, test every generated tile, and stop at the first hit. The chunk-level search below works for this. Exploring touches O(area) tiles, which is exactly why this pass can't be made harder than a scan.
2. **Find a route.** Run the hierarchical search below between the start and the now-known goal. Pass 1 may already have cached chunk summaries on the way, and pass 2 reuses them.

## Why naive search fails, and what to do instead

### Memory needed by flat search

The goal for `north-pole` is about 1.05M tiles away. A BFS or DFS from the start explores roughly a disc of that radius before it reaches the goal: π × (1.05 × 10^6)² × 0.44 ≈ **1.5 × 10^12 air tiles**. The memory needed:

| Representation                                                         | Memory                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Hash set of visited tiles (≥16 bytes per tile, before parent pointers) | **≥ 24 TB**                                                                |
| Dense visited bitmap over the 2.1M × 2.1M bounding square              | 4.4 × 10^12 bits ≈ **550 GB**                                              |
| A\* with Manhattan heuristic                                           | Depends on the maze. Even 1% of the BFS disc is about 240 GB in a hash map |

So flat search is well past 4 GB in every form, and a plain hash-map BFS is past 1 TB. A determined solver with a bit-packed visited set and disk could get a flat BFS into the hundreds of gigabytes, but not into RAM. Double `GoalDistance` and every number above grows 4×.

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

- **In RAM:** the A\* open and closed sets over portals, plus an LRU cache of chunk bitmaps (8 KB each). A corridor of about 4,100 chunks long by about 200 wide needs about 800k chunk summaries. At about 0.5 KB each that's around 400 MB, and the summaries can be evicted too.
- **On disk:** store summaries keyed by `(seed, cx, cy)` in a simple append-only file or a key-value store such as bbolt or SQLite. Because chunks are pure functions of the seed, any summary can be thrown away and recomputed, so the cache is just an optimisation, never a source of truth. Pass 1 and pass 2 share it, as do reruns and threads.
- **Time:** about 26 ms to generate a chunk on one core. 800k chunks take about 6 core-hours, or about 20 minutes on 16 cores. Chunks are independent, so this parallelises perfectly. That cost is why `GoalDistance` defaults to 2^20 and not more. If the challenge should run in minutes, use 2^18 instead: the flat-BFS hash set is then still about 1.5 TB, and the hierarchical solver needs about 1/16 of the chunks.
- **Faster chunks** (optional, for the solver): a chunk generator can evaluate the low-frequency layers once per lattice cell instead of once per tile. `Height` itself stays the reference, and the results must match it bit for bit.
