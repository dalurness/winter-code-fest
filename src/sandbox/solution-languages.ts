// Which code blocks in a community solution the sandbox can turn into files.
// Shared by the sandbox's content (src/pages/sandbox/content.json.ts) and the
// PR check (scripts/check-solution-languages.ts), and the site's code block
// highlighting (astro.config.mjs). The README lists these languages for people
// submitting solutions; keep it in step.

/** Code block languages used in solutions, and the file extension for each */
export const EXTENSIONS: Record<string, string> = {
  asm: "s",
  c: "c",
  clank: "clk",
  cpp: "cpp",
  deno: "ts",
  elixir: "exs",
  erlang: "erl",
  gleam: "gleam",
  go: "go",
  js: "js",
  lua: "lua",
  perl: "pl",
  php: "php",
  python: "py",
  ruby: "rb",
  rust: "rs",
  sh: "sh",
  bash: "sh",
  ts: "ts",
  typescript: "ts",
  zig: "zig",
};

/** Shiki's name for a language, where the code block's isn't one */
const SHIKI_NAMES: Record<string, string> = { deno: "typescript" };

/**
 * Shiki's `langAlias`, for the site's code blocks. Shiki matches names
 * exactly, so ```Deno gets an alias too, as does the capitalized form of
 * every other language.
 */
export const SHIKI_ALIASES: Record<string, string> = Object.fromEntries(
  Object.keys(EXTENSIONS).flatMap((language) => {
    const shiki = SHIKI_NAMES[language];
    const capitalized = language[0]!.toUpperCase() + language.slice(1);
    const aliases: [string, string][] = [[capitalized, shiki ?? language]];
    if (shiki) aliases.push([language, shiki]);
    return aliases;
  })
);

/** Fenced code blocks with a language: ```ruby ... ``` */
const CODE_BLOCK = /^```(\w+)[^\n]*\n([\s\S]*?)^```/gm;

/**
 * Says a solution uses languages the sandbox doesn't support on purpose, so
 * they aren't reported: <!-- sandbox-unsupported: excel, sql -->
 */
const ACKNOWLEDGED = /<!--\s*sandbox-unsupported:([\s\S]*?)-->/gi;

export interface CodeBlock {
  /** As written after the backticks */
  language: string;
  code: string;
  /** Undefined if the sandbox can't make a file of it */
  extension: string | undefined;
  /** 1-based line of the opening fence */
  line: number;
}

export function codeBlocks(markdown: string): CodeBlock[] {
  return [...markdown.matchAll(CODE_BLOCK)].map((match) => {
    const language = match[1] ?? "";
    return {
      language,
      code: match[2] ?? "",
      extension: EXTENSIONS[language.toLowerCase()],
      line: markdown.slice(0, match.index).split("\n").length,
    };
  });
}

/** Code blocks in languages the sandbox doesn't know and the file doesn't acknowledge */
export function unsupportedBlocks(markdown: string): CodeBlock[] {
  const acknowledged = new Set(
    [...markdown.matchAll(ACKNOWLEDGED)].flatMap((match) =>
      (match[1] ?? "")
        .split(",")
        .map((language) => language.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  return codeBlocks(markdown).filter(
    (block) =>
      !block.extension && !acknowledged.has(block.language.toLowerCase())
  );
}
