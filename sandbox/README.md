# WCF Sandbox

The site's `/sandbox/` page boots a small 32-bit Alpine Linux in [v86](https://github.com/copy/v86), with a VS Code-style editor (Monaco), xterm.js terminals and a starter project for each language used in the Winter Code Fest community solutions. Everything runs in the browser; the VM has no network.

The page is [src/pages/sandbox/index.astro](../src/pages/sandbox/index.astro) with its code in [src/sandbox](../src/sandbox). This folder builds the VM image and snapshot it boots from.

| Language                 | Template                  | Run                                               |
| :----------------------- | :------------------------ | :------------------------------------------------ |
| Node 26 (TypeScript)     | `node/main.ts`            | `node main.ts` (type stripping)                   |
| Go                       | `go/main.go`              | `go build`, then the binary                       |
| Ruby                     | `ruby/main.rb`            | `ruby main.rb`                                    |
| Python                   | `python/main.py`          | `python main.py`                                  |
| Rust                     | `rust/src/main.rs`        | `cargo build -q`, then the binary                 |
| C                        | `c/main.c`                | `cc -O1 -Wall -o main main.c && ./main`           |
| C++                      | `cpp/main.cpp`            | `g++ -O1 -Wall -o main main.cpp && ./main`        |
| Zig                      | `zig/src/main.zig`        | `zig build-exe`, then the binary                  |
| Gleam (Erlang target)    | `gleam/src/sandbox.gleam` | `gleam build`, then `erl` (`simplifile` vendored) |
| Elixir                   | `elixir/main.exs`         | `elixir main.exs`                                 |
| Erlang                   | `erlang/main.erl`         | `escript main.erl`                                |
| Lua                      | `lua/main.lua`            | `lua main.lua`                                    |
| PHP                      | `php/main.php`            | `php main.php`                                    |
| Perl                     | `perl/main.pl`            | `perl main.pl`                                    |
| Clank                    | `clank/main.clk`          | `clank run main.clk`                              |
| x86 assembly (AT&T, gas) | `asm/main.s`              | `cc -no-pie -o main main.s && ./main`             |
| Bash                     | `bash/main.sh`            | `bash main.sh`                                    |

**Run** runs the open file: with its starter project's `run.sh` if it is in one, otherwise with the toolchain for its extension. Community solutions run from their day's folder, so relative paths to the input files work.

Every day's question, input files and community solutions are added to `/workspace/days/NN/` when the page starts, from [src/pages/sandbox/content.json.ts](../src/pages/sandbox/content.json.ts). They are not in the image, so a new day or solution only needs a site deploy. Input files are fetched from the site's `/day/NN/` only when the VM reads them. Each solution's code blocks are also saved as `solution.<ext>` files. `sqlite` and `zstd` are installed for day 14's database.

`/sandbox/?day=NN` opens a day's page and `/sandbox/?day=NN&solution=name` a solution's, for the site's pages to link to. Each opens the real page in a tab; its links to input files open the VM's copy, and its sandbox links open the solution's code.

Zig 0.15.2 comes from the official `x86-linux` tarball because Alpine only packages it for 64-bit. [Clank](https://github.com/dalurness/clank) has no releases for x86, so the Dockerfile builds it with the image's Go from a pinned commit and copies that commit's `SPEC.md` into the template.

### Community solution compatibility

Every code block in `src/content/communitySolutions` was checked against these toolchains in an i386 container:

| Language         | Result                                                                                                                                                                           |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruby (10)        | All pass `ruby -c`                                                                                                                                                               |
| Rust (2), Go (1) | All compile                                                                                                                                                                      |
| Assembly (1)     | Builds with `gcc -no-pie`; it uses `int $0x80`, which suits the 32-bit VM                                                                                                        |
| TypeScript (8)   | Written for Deno (`Deno.readTextFile`, `Deno.open`), which is not included; they need porting to `node:fs`                                                                       |
| Elixir (1)       | Runs                                                                                                                                                                             |
| Gleam (6)        | All build. Needs `gleam_stdlib < 0.48`; newer versions removed `io.debug` and `string_builder`                                                                                   |
| Zig (12)         | 11 build with 0.15.2. Zig 0.16 breaks 8 of them (`std.fs.cwd`, `std.time.milliTimestamp`). `08/dalurness.md`'s second block has markdown escapes (`\*`, `\_`) in the code itself |

## Building

The image is built by the [Build sandbox image](../.github/workflows/sandbox-image.yml) workflow, when anything in this folder changes or by hand, and published as the `sandbox-image` release. The [deploy](../.github/workflows/deploy.yml) downloads it into `public/sandbox/v86/` before building the site, and runs again when a new image is published. It is about 450 MB in some 18,000 files, too much for git.

To build it locally you need Docker or Podman, Python 3.14+ (for its built-in `compression.zstd`) and the `zstd` command. From the repository root:

```bash
npm run sandbox:image   # build the image into public/sandbox/v86/ (ZSTD_LEVEL=9 for faster builds)
npm run sandbox:state   # boot it headless, run every template twice, save the snapshot, bundle the files
npm run dev             # then open /winter-code-fest/sandbox/
```

`npm run sandbox:state` prints per-language run times from inside the emulator, which doubles as a check that every toolchain works under v86. Zig's first run there takes about 3.5 minutes. Without a snapshot the page cold boots, which takes a minute or more. Add `?fresh` to the URL to force a cold boot.

## How it works

- **Image:** [image/Dockerfile](image/Dockerfile) follows v86's `tools/docker/alpine` and adds the toolchains and the templates in [image/workspace](image/workspace), then runs each template once so build caches are warm (cargo `target/`, Go's build and `go run` caches, zig-cache, gleam `build/`, Node's compile cache via `NODE_COMPILE_CACHE`). `npm run state` runs them twice more inside the emulator before saving the snapshot. [image/build.sh](image/build.sh) exports it as a 9p filesystem: `alpine-fs.json` (the index) plus one zstd file per file, fetched lazily, so a Ruby user never downloads rustc. Files are named by content hash and never deleted, so rebuilding while a page is open does not break it; `alpine-fs.json` is replaced last.
- **Bundles:** one request per file is slow when every request costs a round trip (Go's first run reads about 900 files), so `npm run sandbox:state` also packs the per-file zstd files into a few bundles ([image/bundle.py](image/bundle.py)). Each install step in the Dockerfile records the files it added (`bundle-mark`), which decides each file's bundle. Then the snapshot is restored like the page does and every template runs once, and the order the VM reads files in becomes the order inside each bundle. The bundles are:
  - **base:** files outside any language that a run read (bash, `sb`, libc). The page downloads it right after the snapshot restores.
  - **One per large language** (Go, Rust, C/C++, Zig, Node, Python, Erlang/Elixir/Gleam), and **rest** for the small ones together. The page starts streaming one when a file of that language is opened, or when the VM first reads a file in it. A file is usable as soon as its bytes arrive. One that is more than 2 MB further down the stream is fetched on its own with a range request.
  - **misc:** everything no run read (the kernel, modules, docs). It is never downloaded whole, only single files with range requests.

  Bundles are saved in the browser's Cache Storage, named by content, so a later visit only downloads the ones that changed. The site only publishes the bundles, not the per-file directory, so `?fresh` cold boots only work locally.
- **Snapshot:** [scripts/build-state.ts](scripts/build-state.ts) shares its VM options with the page ([src/sandbox/vm-options.ts](../src/sandbox/vm-options.ts)); a saved state only restores into a VM with the same memory size and devices, and the same v86 version. Before saving, it fills free guest memory with zeros so the snapshot compresses to about 33 MB. Reset restores the same snapshot in place.
- **Files:** [src/sandbox/files.ts](../src/sandbox/files.ts) reads and writes v86's in-JS 9p filesystem directly. Existing files are rewritten in place, because `create_file` adds a second inode under the same name that the guest's cached dentry never sees. The root is mounted `cache=loose`, so the guest keeps its cached copy of a file written from JS; each save is also staged in `/.sb`, and `sb` copies staged files over their targets from inside the guest. Dropping the whole page cache instead made every run re-read its toolchain over 9p (Node took 11 s instead of 6).
- **Run:** saves dirty files and types `sb run … FILE` into the active terminal. `sb` ([image/sb](image/sb)) also sets the guest clock from v86's emulated RTC, which follows the browser's clock (cargo and the C template compare mtimes with the editor's saves, and the kernel's clock falls behind after a snapshot restore or while the tab is hidden), and the terminal size, then prints how long the run took inside the guest and how many instructions it took. The root is mounted with `ignoreqv`: v86 reports every file's version as 0, which otherwise makes Linux skip its page cache and re-read files on every open.
- **Benchmark:** v86 counts every instruction the emulated machine runs. `sb` prints escape sequences that xterm ignores (`ESC ] 7771 ; start BEL` and so on) right before the program starts and after it exits, and [src/sandbox/terminal.ts](../src/sandbox/terminal.ts) reads the counter the moment the serial port sends each one. A project's `run.sh` builds first and then runs the program with `sb exec`, which marks the start again, so builds are not counted. That raw count also has the kernel starting and ending the process (about 850K instructions even for the 60-instruction asm template) and background work like timer interrupts (about 1.8M per real second, so more in a slower browser), so two estimates are subtracted: the median count of `sb-empty`, a program that only exits, run five times the same way first, and the guest's idle rate, measured in quiet seconds, times the run's real duration. The result, shown with ≈, is close to the program's own instructions but still varies a little between runs. Benchmark runs the file once to build and warm caches, then the number of times set in Settings with output discarded, and reports the median and range. Exact counts would need hardware performance counters, which v86 does not emulate, or Valgrind, which is 20–40× slower.
- **Editor:** tabs (drag to reorder), files and folders added by dropping them on the explorer (into the folder under the pointer) or the editor (into the open file's folder, and opened) or with the explorer's upload button (into the last folder clicked), an explorer (`/workspace` and `/tmp`, or the whole VM with a setting), Ctrl+P to find a file, and VS Code's shortcuts where the browser allows them (it keeps Ctrl+W and Ctrl+Tab); the settings tab lists them. Settings open in a tab (theme: Winter Day, Winter Night or the system's preference, the default; auto save, whitespace, word wrap, minimap, font size, benchmark runs) and are kept in `localStorage`; it also lists the shortcuts. Monaco picks the language from the file name; [src/sandbox/highlight.ts](../src/sandbox/highlight.ts) adds grammars for Zig, Gleam, Erlang, Clank, TOML, Makefile and GNU assembler. Markdown opens rendered with `marked` (no math or MDX components); right-click its tab or press Ctrl+Shift+V for the source.
- **Page tabs:** day and solution pages from the site open in tabs (`?day=03`, `?day=03&solution=name`, or ⌂ for a new tab at the home page). Each works like a small browser limited to the site, hides the site's "Open in the sandbox" buttons, and cannot navigate the sandbox's own browser tab (the frame is sandboxed without `allow-top-navigation`); scripts or forms that go to another site open it in a new browser tab instead (Navigation API, where the browser has it): links and the address bar stay on Winter Code Fest pages and never the sandbox itself, external links open in a real browser tab, and each tab keeps its own history so it stays out of the browser's back button. Links to a day's input files open the VM's copy, and links to the sandbox open what they point to here.
- **Terminals:** ttyS0 and ttyS1 each run an autologin getty; "+" attaches the second. `tmux` is installed too.

Network bytes, time to prompt and per-run timings are collected in `window.sandboxMetrics`.

## Known limits

- Terminal size is sent to the guest on each run, not on every resize.
- No persistence across reloads yet.
- Commands typed in a terminal see saved edits after Run or `sb sync`.
