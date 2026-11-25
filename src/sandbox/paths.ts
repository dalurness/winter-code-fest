// Kept apart from files.ts, which needs v86, so the page can use it without
// bundling the emulator that only the worker runs

/** Resolves `.` and `..` segments in an absolute path. */
export function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return `/${parts.join("/")}`;
}
