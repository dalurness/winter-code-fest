// Every day's question, input files and community solutions, which the
// sandbox adds to /workspace/days/NN/ when it starts. Keeping them out of the
// VM image means a new day or solution only needs a site deploy.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readdirSync, statSync } from "node:fs";
import type { ContentFile } from "../../sandbox/content";
import {
  codeBlocks,
  unsupportedBlocks,
} from "../../sandbox/solution-languages";

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
    for (const { extension, code } of codeBlocks(body)) {
      if (!extension) continue;
      const count = (counts.get(extension) ?? 0) + 1;
      counts.set(extension, count);
      const suffix = count === 1 ? "" : `-${count}`;
      files.push({ path: `${dir}/solution${suffix}.${extension}`, text: code });
    }

    // The PR check fails on these; this catches anything merged around it
    for (const { language } of unsupportedBlocks(body)) {
      console.warn(
        `Sandbox: no file for \`\`\`${language} code blocks in ${entry.id}; see scripts/check-solution-languages.ts`
      );
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
