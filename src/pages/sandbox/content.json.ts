// Every day's question, input files and community solutions, which the
// sandbox adds to /workspace/days/NN/ when it starts. Keeping them out of the
// VM image means a new day or solution only needs a site deploy.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readdirSync, statSync } from "node:fs";
import type { ContentFile } from "../../sandbox/content";

/** Code block languages used in solutions, and the file extension for each */
const EXTENSIONS: Record<string, string> = {
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

/** Fenced code blocks with a language: ```ruby ... ``` */
const CODE_BLOCK = /^```(\w+)[^\n]*\n([\s\S]*?)^```/gm;

export const GET: APIRoute = async () => {
  const files: ContentFile[] = [];

  for (const entry of await getCollection("days")) {
    const day = entry.id;
    const extension = entry.filePath?.endsWith(".mdx") ? "mdx" : "md";
    files.push({
      path: `${day}/question.${extension}`,
      text: `# ${entry.data.title}\n\n${entry.body ?? ""}`,
    });

    // Inputs are fetched from the site only when the VM reads them; some
    // are tens of MB
    const inputs = `public/day/${day}`;
    for (const name of readdirSafe(inputs)) {
      files.push({
        path: `${day}/${name}`,
        url: `day/${day}/${name}`,
        size: statSync(`${inputs}/${name}`).size,
      });
    }
  }

  for (const entry of await getCollection("communitySolutions")) {
    const [day, user] = entry.id.split("/");
    const dir = `${day}/solutions/${user}`;
    const body = entry.body ?? "";
    files.push({ path: `${dir}/README.md`, text: `# ${user}\n\n${body}` });

    // Each code block also becomes its own file: solution.rb, solution-2.rb
    const counts = new Map<string, number>();
    for (const [, language = "", code = ""] of body.matchAll(CODE_BLOCK)) {
      const extension = EXTENSIONS[language.toLowerCase()];
      if (!extension) continue;
      const count = (counts.get(extension) ?? 0) + 1;
      counts.set(extension, count);
      const suffix = count === 1 ? "" : `-${count}`;
      files.push({ path: `${dir}/solution${suffix}.${extension}`, text: code });
    }
  }

  return new Response(JSON.stringify(files), {
    headers: { "Content-Type": "application/json" },
  });
};

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir).filter((name) =>
      statSync(`${dir}/${name}`).isFile()
    );
  } catch {
    return [];
  }
}
