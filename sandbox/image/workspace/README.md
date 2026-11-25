# Winter Code Fest sandbox

A small Linux VM running in your browser, with no network. Files you edit in the editor are kept when you reload, separately for each chillenge you open the sandbox from; the rest of the VM (build outputs, files only changed in the terminal) starts over. Reset VM starts the chillenge fresh.

- **Run** (Ctrl+Enter) runs the open file, with its starter project's `run.sh` or the toolchain for its extension. Community solutions run next to their chillenge's input files.
- **Benchmark** (Ctrl+Shift+Enter) runs it a few more times without output and reports how many instructions the VM ran for the program (not its build). Unlike the time, that count stays about the same in any browser.
- `days/NN/` has chillenge NN's question, its input files and the community solutions.
- Starter projects: `node` (TypeScript), `go`, `ruby`, `python`, `rust`, `c`, `cpp`, `zig`, `gleam`, `elixir`, `erlang`, `lua`, `php`, `perl`, `clank` (its whole spec is in `clank/SPEC.md`), `asm` (x86, AT&T syntax) and `bash`.
- A program can serve on `localhost` for other programs in the VM, as in `curl localhost:8080`.
- Ctrl+Shift+C and Ctrl+Shift+V copy and paste in the terminals. `wl-copy` and `wl-paste` reach your clipboard from the shell, as in `ls | wl-copy`; `xclip`, `xsel`, `pbcopy` and `pbpaste` work too.
