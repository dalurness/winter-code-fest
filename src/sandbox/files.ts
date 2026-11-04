import { STATUS_ON_STORAGE, storageNameForSiteUrl, type Emulator } from "./vm";

export interface Entry {
  name: string;
  path: string;
  kind: "dir" | "file" | "link";
  /** Symlink target, as stored */
  target?: string;
}

const S_IFMT = 0o170000;
const S_IFDIR = 0o040000;
const S_IFLNK = 0o120000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Saved files waiting for `sb` to copy them into place inside the guest */
const STAGING = "/.sb";

/**
 * Reads and writes files in the VM through v86's in-JS 9p filesystem.
 *
 * The root is mounted cache=loose, so the guest keeps serving its cached copy
 * of a file written from here. Each write is also staged in STAGING, under a
 * name the guest has never looked up, and sb-agent (when `onStaged` tells it,
 * see sync.ts) or `sb run` copy staged files over their targets from inside
 * the guest, which updates its cache. That avoids dropping the whole page
 * cache, which made every run re-read its toolchain over 9p.
 */
export class FileService {
  private staged = 0;
  /** Called after each write is staged */
  onStaged?: (path: string) => void;

  constructor(private vm: Emulator) {}

  private get fs() {
    return this.vm.fs9p;
  }

  exists(path: string): boolean {
    return this.fs.SearchPath(path).id !== -1;
  }

  isDir(path: string): boolean {
    const { id } = this.fs.SearchPath(path);
    return id !== -1 && (this.fs.GetInode(id).mode & S_IFMT) === S_IFDIR;
  }

  /** Directory entries, directories first. */
  list(dir: string): Entry[] {
    const prefix = dir === "/" ? "" : dir;
    return (this.fs.read_dir(dir) ?? [])
      .map((name): Entry => {
        const path = `${prefix}/${name}`;
        const inode = this.fs.GetInode(this.fs.SearchPath(path).id);
        const type = inode.mode & S_IFMT;
        if (type === S_IFDIR) return { name, path, kind: "dir" };
        if (type === S_IFLNK)
          return { name, path, kind: "link", target: inode.symlink ?? "" };
        return { name, path, kind: "file" };
      })
      .sort(
        (a, b) =>
          Number(b.kind === "dir") - Number(a.kind === "dir") ||
          a.name.localeCompare(b.name)
      );
  }

  /** Follows symlinks to a regular file. Returns undefined for anything else. */
  resolveFile(path: string): string | undefined {
    for (let hops = 0; hops < 8; hops++) {
      const { id } = this.fs.SearchPath(path);
      if (id === -1) return undefined;
      const inode = this.fs.GetInode(id);
      const type = inode.mode & S_IFMT;
      if (type === S_IFDIR) return undefined;
      if (type !== S_IFLNK) return path;
      const target = inode.symlink!;
      path = target.startsWith("/")
        ? target
        : normalize(`${path.slice(0, path.lastIndexOf("/"))}/${target}`);
    }
    return undefined;
  }

  size(path: string): number {
    return this.fs.GetInode(this.fs.SearchPath(path).id).size;
  }

  async readBytes(path: string): Promise<Uint8Array> {
    return this.vm.read_file(path);
  }

  async read(path: string): Promise<string> {
    return decoder.decode(await this.vm.read_file(path));
  }

  async write(path: string, contents: string | Uint8Array): Promise<void> {
    const data =
      typeof contents === "string" ? encoder.encode(contents) : contents;
    const { id } = this.fs.SearchPath(path);

    if (id === -1) {
      this.mkdirp(path.slice(0, path.lastIndexOf("/")));
      await this.vm.create_file(path, data);
    } else {
      // create_file would add a second inode under the same name, which the
      // guest's cached dentry would never see. Rewrite the existing one.
      await this.fs.set_data(id, data);
      this.fs.GetInode(id).size = data.length;
    }

    // cargo and the C template decide what to rebuild by mtime
    this.fs.GetInode(this.fs.SearchPath(path).id).mtime = Math.floor(
      Date.now() / 1000
    );

    // Names sort in save order, and are unique across snapshot restores.
    // The data goes first: `sb` looks for the .path file.
    const name = `${STAGING}/${Date.now()}-${String(this.staged++).padStart(6, "0")}`;
    await this.vm.create_file(`${name}.data`, data);
    await this.vm.create_file(`${name}.path`, encoder.encode(path));
    this.onStaged?.(path);
  }

  /** The inode at a path and its directory's, or -1 if there is none */
  locate(path: string): { id: number; parentid: number } {
    return this.fs.SearchPath(path);
  }

  /**
   * Makes a folder and any missing parents. The guest sees new names on its
   * next lookup, since cache=loose only keeps what it has already looked up.
   */
  mkdir(path: string) {
    this.mkdirp(path);
  }

  /** Adds a file the guest has never seen, so it needs no staging. */
  add(path: string, text: string) {
    const id = this.createFile(path);
    const data = encoder.encode(text);
    void this.fs.set_data(id, data);
    this.fs.GetInode(id).size = data.length;
  }

  /** Adds a file whose contents are fetched from the site when first read. */
  addRemote(path: string, url: string, size: number) {
    const inode = this.fs.GetInode(this.createFile(path));
    inode.size = size;
    inode.status = STATUS_ON_STORAGE;
    inode.sha256sum = storageNameForSiteUrl(url);
  }

  private createFile(path: string): number {
    const slash = path.lastIndexOf("/");
    return this.fs.CreateFile(
      path.slice(slash + 1),
      this.mkdirp(path.slice(0, slash))
    );
  }

  private mkdirp(dir: string): number {
    let parent = this.fs.SearchPath("/").id;
    let current = "";
    for (const part of dir.split("/").filter(Boolean)) {
      current += `/${part}`;
      const { id } = this.fs.SearchPath(current);
      parent = id === -1 ? this.fs.CreateDirectory(part, parent) : id;
    }
    return parent;
  }
}

/** Resolves `.` and `..` segments in an absolute path. */
export function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return `/${parts.join("/")}`;
}
