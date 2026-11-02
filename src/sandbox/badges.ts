// Small text badges that stand in for file icons, colored like VS Code's.

const BY_EXTENSION: Record<string, [string, string]> = {
  c: ["C", "#599eff"],
  h: ["H", "#a074c4"],
  html: ["◇", "#5d7dba"],
  cpp: ["C+", "#f34b7d"],
  clk: ["CK", "#6fb3d2"],
  ex: ["EX", "#a074c4"],
  exs: ["EX", "#a074c4"],
  gleam: ["★", "#ffaff3"],
  go: ["GO", "#00add8"],
  js: ["JS", "#cbcb41"],
  json: ["{}", "#cbcb41"],
  md: ["M↓", "#519aba"],
  mdx: ["M↓", "#f9ac00"],
  py: ["PY", "#3572a5"],
  rb: ["RB", "#cc342d"],
  rs: ["RS", "#dea584"],
  s: ["AS", "#e37933"],
  sh: ["$_", "#89e051"],
  sqlite: ["DB", "#c1b7ff"],
  toml: ["TM", "#9c4221"],
  ts: ["TS", "#3178c6"],
  txt: ["≡", "#9d9d9d"],
  zig: ["Z", "#f7a41d"],
  zst: ["ZS", "#9d9d9d"],
};

const BY_NAME: Record<string, [string, string]> = {
  Makefile: ["MK", "#e37933"],
  "Cargo.lock": ["TM", "#9c4221"],
  // The settings tab
  Settings: ["⚙", "#5d7dba"],
};

export function badge(name: string): HTMLElement {
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const [text, color] = BY_NAME[name] ??
    (name.includes(".") ? BY_EXTENSION[extension] : undefined) ?? ["·", ""];
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = text;
  if (color) span.style.setProperty("--badge", color);
  return span;
}
