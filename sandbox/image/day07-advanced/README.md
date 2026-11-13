# Day 7, advanced: the endless map

Congratulations, you found an advanced challenge! If you're poking around in here, you must be having fun. Try this one if you want to have a really good time.

Buddy's map from day 7 was small enough to read into memory. This one isn't: it has no edges. Every tile in a plane of 2^64 × 2^64 is generated on demand from a seed, so the only way to see the map is to ask for it, one piece at a time.

## The challenge

- Find a route from the **start** to the **goal** for your seed.
- Tiles are **air** or **mountain**. You can walk on air (height 0 or less), never on mountains (height 1 or more).
- Moves are **north, east, south and west** only. Two air tiles that touch only at a corner are not connected. North is `-y`.
- The goal is between 262,144 and 524,288 tiles from the start, so you'll explore something like 10^11 tiles if you search naively. You'll need something smarter, such as searching in chunks and keeping only summaries of them.
- Every seed has a route. The map is generated so that a winding network of valleys always connects the start to the goal, though there are usually much shorter routes.
- Want it extra hard? Don't ask where the goal is. Explore until you find it, checking the tiles you reach with `isgoal` (honour system).

Your answer is the route, and shorter is better. Pick any seed you like: a number or any string, such as your name.

## The `day07-map` tool

`day07-map` is in this folder. From `days/07/`:

```bash
./advanced/day07-map goal -seed north-pole        # print the start and the goal
./advanced/day07-map -seed north-pole             # open the map viewer
./advanced/day07-map chunk -x 4600 -y 2190 -w 40 -h 10 -seed north-pole   # print tiles as O/X
```

The viewer pans with the arrow keys or WASD, zooms with `+` and `-`, jumps to the start with `o` and the goal with `g`, and quits with `q`. `m` switches between coloured blocks and O/X letters, `p` changes the palette, `c` highlights the guaranteed valleys, and `?` shows every key. It's slow inside this browser VM, so stay near zoom 1:1. The fastest way to explore is on your own computer, by building it from `tools/day07-map` in the Winter Code Fest repository.

## Using it from a solution

Run `day07-map serve` as a child process. Your program writes requests to its stdin, one per line, and reads the replies from its stdout. Every reply starts with one header line, `ok ...` or `error <message>`.

| Request                  | Reply                                                               |
| :----------------------- | :------------------------------------------------------------------ |
| `chunk X Y W H [FORMAT]` | `ok W H FORMAT`, then the W×H tiles whose top-left corner is (X, Y) |
| `tile X Y`               | `ok HEIGHT`                                                         |
| `start` / `goal`         | `ok X Y`                                                            |
| `isgoal X Y`             | `ok true` if (X, Y) is the goal, else `ok false`                    |
| `quit`                   | Exits. So does closing stdin                                        |

Chunk formats (pick the default with `serve -format`; it's `ox` otherwise):

- `ox`: H lines of W characters, `O` for air and `X` for mountain, like the original day 7.
- `heights`: H lines of W heights separated by spaces.
- `raw`: exactly W×H bytes, row by row, each height as a signed byte. The fastest to read.

Ask for chunks, not single tiles: each request costs far more than a tile does. A chunk can be up to 4096×4096.

Python, run from `days/07/`:

```python
import subprocess

srv = subprocess.Popen(["./advanced/day07-map", "serve", "-seed", "north-pole"],
                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

def ask(line):
    srv.stdin.write(line + "\n")
    srv.stdin.flush()
    head = srv.stdout.readline().split()
    if head[0] != "ok":
        raise RuntimeError(" ".join(head[1:]))
    return head[1:]

sx, sy = map(int, ask("start"))
gx, gy = map(int, ask("goal"))
w, h = 64, 16
ask(f"chunk {sx - w // 2} {sy - h // 2} {w} {h}")
rows = [srv.stdout.readline().rstrip("\n") for _ in range(h)]
print("\n".join(rows))  # rows[y][x] == "O" means tile (sx - 32 + x, sy - 8 + y) is air
```

TypeScript (Node), run from `days/07/`:

```ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const srv = spawn("./advanced/day07-map", ["serve", "-seed", "north-pole"]);
const lines = createInterface({ input: srv.stdout })[Symbol.asyncIterator]();
const next = async () => (await lines.next()).value as string;

async function ask(line: string): Promise<string[]> {
  srv.stdin.write(line + "\n");
  const [status, ...rest] = (await next()).split(" ");
  if (status !== "ok") throw new Error(rest.join(" "));
  return rest;
}

const [sx, sy] = (await ask("start")).map(Number);
await ask(`chunk ${sx - 32} ${sy - 8} 64 16`);
for (let y = 0; y < 16; y++) console.log(await next());
srv.stdin.end();
```

Any language that can start a process and read its output works the same way. In this VM a 256×256 chunk takes a few seconds, so a full search to the goal needs a real computer and patience: build `day07-map` there and use the same protocol.
