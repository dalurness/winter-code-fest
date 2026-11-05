// Fails when a community solution has a code block the sandbox can't turn
// into a file, usually a typo like ```golang for ```go. Run in CI on pull
// requests: node scripts/check-solution-languages.ts
//
// A solution in a language the sandbox doesn't support on purpose says so in
// a comment anywhere in its markdown, which the site doesn't show:
//
//   <!-- sandbox-unsupported: excel -->
//
// Several languages are separated by commas.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  EXTENSIONS,
  unsupportedBlocks,
} from "../src/sandbox/solution-languages.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = "src/content/communitySolutions";
const supported = Object.keys(EXTENSIONS).sort().join(", ");
const inCi = !!process.env["GITHUB_ACTIONS"];

let failures = 0;
const files = readdirSync(`${root}${dir}`, { recursive: true })
  .map(String)
  .filter((name) => name.endsWith(".md"))
  .sort();

for (const name of files) {
  const path = `${dir}/${name.replaceAll("\\", "/")}`;
  const markdown = readFileSync(`${root}${path}`, "utf8");
  for (const { language, line } of unsupportedBlocks(markdown)) {
    failures++;
    const message = `The sandbox can't run \`\`\`${language} code blocks. If it's a typo, use one of: ${supported}. If the language isn't supported, add <!-- sandbox-unsupported: ${language.toLowerCase()} --> to the file.`;
    // An annotation on the pull request's diff, at the code block
    if (inCi) console.log(`::error file=${path},line=${line}::${message}`);
    else console.error(`${path}:${line}: ${message}`);
  }
}

if (failures) {
  console.error(
    `\n${failures} code block${failures === 1 ? "" : "s"} in an unrecognized language.`
  );
  process.exit(1);
}
console.log(
  `Checked ${files.length} solutions: every code block's language is known.`
);
