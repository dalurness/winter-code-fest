# Winter Code Fest sandbox

A small Linux VM running in your browser, with no network. Everything here is lost when you reload the page.

- **Run** (Ctrl+Enter) runs the open file. Files in a starter project run with that project's `run.sh`; any other file runs with the toolchain for its extension. Community solutions run from their day's folder, next to its input files.
- **Benchmark** (Ctrl+Shift+Enter) runs it a few more times without output and reports how many instructions the VM ran for the program (not its build). Unlike the time, that count stays about the same in any browser.
- `days/` has every day's question, its input files and the community solutions.
- Starter projects: `node` (TypeScript), `go`, `ruby`, `python`, `rust`, `c`, `cpp`, `zig`, `gleam`, `elixir`, `erlang`, `lua`, `php`, `perl`, `clank` (its whole spec is in `clank/SPEC.md`), `asm` (x86, AT&T syntax) and `bash`.
- `/tmp` is a good place for scratch files.
- The editor and the terminals see each other's changes as they happen: a saved file is ready in the terminal, and files a program writes show up in the editor.
- `wl-copy` copies to your clipboard and `wl-paste` pastes from it, as in `ls | wl-copy` or `wl-paste > notes.txt`. `xclip`, `xsel`, `pbcopy` and `pbpaste` work too. Ctrl+Shift+C and Ctrl+Shift+V copy and paste in the terminals.
