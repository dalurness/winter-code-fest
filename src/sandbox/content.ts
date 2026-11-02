import type { FileService } from "./files";

/** A file under /workspace/days, from the site's /sandbox/content.json */
export type ContentFile =
  | { path: string; text: string }
  /** An input file on the site, relative to its base URL */
  | { path: string; url: string; size: number };

export const DAYS_DIR = "/workspace/days";

export async function fetchContent(): Promise<ContentFile[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}sandbox/content.json`);
  return res.ok ? res.json() : [];
}

/**
 * Adds the days to the VM's filesystem. Runs after every snapshot restore,
 * since restoring replaces the filesystem too.
 */
export function addContent(files: FileService, content: ContentFile[]) {
  for (const file of content) {
    const path = `${DAYS_DIR}/${file.path}`;
    if ("text" in file) files.add(path, file.text);
    else files.addRemote(path, file.url, file.size);
  }
}
