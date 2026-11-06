// Submitting a solution from the sandbox as a pull request, without the API.
//
// GitHub's new file page takes the file's name and contents from the URL:
//   github.com/OWNER/REPO/new/main?filename=path/to/file.md&value=...
// Someone without write access who opens it gets "Fork this repository and
// propose changes": GitHub forks the repo for them on the spot, commits the
// file to a branch of the fork, and lands on the pull request form. So one
// click here plus "Commit changes" and "Create pull request" there is all.
//
// GitHub's edit page takes no contents, so adding a year to a solution file
// that already exists copies the new section and opens the editor to paste it.

import { EXTENSIONS } from "./solution-languages";

const REPO = "https://github.com/dalurness/winter-code-fest";
const BRANCH = "main";
const SOLUTIONS_DIR = "src/content/communitySolutions";
/**
 * GitHub answers longer URLs with an error page. Long solutions go by
 * clipboard instead, with the file name still filled in.
 */
const MAX_URL = 8000;

const USERNAME_KEY = "wcf-sandbox-github-user";

/** GitHub usernames: letters, digits and single hyphens, up to 39 characters */
export const validUsername = (name: string) =>
  /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(name);

export function savedUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveUsername(name: string) {
  try {
    localStorage.setItem(USERNAME_KEY, name);
  } catch {
    // Blocked storage: they type it again next time
  }
}

/** Preferred code block tag for each extension, where several share one */
const PREFERRED: Record<string, string> = { ts: "ts", sh: "bash", S: "asm" };
const EXTRA: Record<string, string> = {
  mjs: "js",
  ex: "elixir",
  cc: "cpp",
  cxx: "cpp",
};

/** The code block tag for a file, from solution-languages' list */
export function tagFor(path: string): string | undefined {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  if (PREFERRED[extension]) return PREFERRED[extension];
  if (EXTRA[extension]) return EXTRA[extension];
  return Object.keys(EXTENSIONS).find((tag) => EXTENSIONS[tag] === extension);
}

const NAMES: Record<string, string> = {
  asm: "Assembly",
  cpp: "C++",
  js: "JavaScript",
  ts: "TypeScript",
};
const displayName = (tag: string) =>
  NAMES[tag] ?? tag[0]!.toUpperCase() + tag.slice(1);

/** A fence longer than any backtick run in the code, so the code can't end it */
function fence(code: string): string {
  const longest = Math.max(
    0,
    ...[...code.matchAll(/`+/g)].map((m) => m[0].length)
  );
  return "`".repeat(Math.max(3, longest + 1));
}

/** The year's heading and code block, as solution files have them */
export function section(code: string, tag: string, year: number): string {
  const f = fence(code);
  const body = code.endsWith("\n") ? code : code + "\n";
  return `## ${year} Solution ${displayName(tag)}\n\n${f}${tag}\n${body}${f}\n`;
}

/** A whole new solution file */
export function solutionFile(code: string, tag: string, year: number): string {
  return `---\ndescriptions: ["${tag}"]\n---\n\n${section(code, tag, year)}`;
}

export interface Submission {
  /** Opened in a new tab */
  url: string;
  /** Put on the clipboard for pasting, when the URL can't carry it */
  clipboard?: string;
  /** What to tell them */
  message: string;
}

export function submission({
  day,
  username,
  code,
  tag,
  exists,
  year = new Date().getFullYear(),
}: {
  /** Two digits, like "07" */
  day: string;
  username: string;
  code: string;
  tag: string;
  /** Whether a solution file is already merged for them on this day */
  exists: boolean;
  year?: number;
}): Submission {
  const path = `${SOLUTIONS_DIR}/${day}/${username}.md`;

  if (exists) {
    return {
      url: `${REPO}/edit/${BRANCH}/${path}`,
      clipboard: section(code, tag, year) + "\n",
      message: `You already have a day ${Number(day)} solution. Your ${year} section is copied: paste it under the --- line and add "${tag}" to descriptions if it's new.`,
    };
  }

  const params = new URLSearchParams({ filename: path });
  const base = `${REPO}/new/${BRANCH}?${params}`;
  const file = solutionFile(code, tag, year);
  const full = `${base}&${new URLSearchParams({ value: file })}`;
  if (full.length <= MAX_URL)
    return {
      url: full,
      message: `Opened GitHub with ${username}.md filled in. Commit it there and open the pull request.`,
    };
  return {
    url: base,
    clipboard: file,
    message: `Your solution is too long to send in a link, so it's copied: paste it into the file on GitHub, then commit and open the pull request.`,
  };
}
