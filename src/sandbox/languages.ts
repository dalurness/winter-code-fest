export interface Language {
  id: string;
  label: string;
  /** Directory under /workspace */
  dir: string;
  /** File opened when the language is picked, relative to dir */
  main: string;
}

export const LANGUAGES: Language[] = [
  { id: "node", label: "Node 26 (TypeScript)", dir: "node", main: "main.ts" },
  { id: "go", label: "Go", dir: "go", main: "main.go" },
  { id: "ruby", label: "Ruby", dir: "ruby", main: "main.rb" },
  { id: "python", label: "Python", dir: "python", main: "main.py" },
  { id: "rust", label: "Rust", dir: "rust", main: "src/main.rs" },
  { id: "c", label: "C", dir: "c", main: "main.c" },
  { id: "cpp", label: "C++", dir: "cpp", main: "main.cpp" },
  { id: "zig", label: "Zig", dir: "zig", main: "src/main.zig" },
  { id: "gleam", label: "Gleam", dir: "gleam", main: "src/sandbox.gleam" },
  { id: "elixir", label: "Elixir", dir: "elixir", main: "main.exs" },
  { id: "erlang", label: "Erlang", dir: "erlang", main: "main.erl" },
  { id: "lua", label: "Lua", dir: "lua", main: "main.lua" },
  { id: "php", label: "PHP", dir: "php", main: "main.php" },
  { id: "perl", label: "Perl", dir: "perl", main: "main.pl" },
  { id: "clank", label: "Clank", dir: "clank", main: "main.clk" },
  { id: "asm", label: "x86 assembly (gas)", dir: "asm", main: "main.s" },
  { id: "bash", label: "Bash", dir: "bash", main: "main.sh" },
];
