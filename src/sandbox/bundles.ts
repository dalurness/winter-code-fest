// The image's files come in a few bundles (see sandbox/image/bundle.py)
// instead of one request per file: Go alone reads ~900 files on its first
// run, and each request costs a round trip. A bundle streams in the order the
// files were read when it was built, and a file is usable as soon as its bytes
// arrive. Bundles are kept in Cache Storage, so a later visit downloads only
// what changed.

/** public/sandbox/v86/bundles.json */
interface Index {
  bundles: {
    name: string;
    url: string;
    size: number;
    /** File names without .bin.zst, and their compressed sizes, in pack order */
    files: [string, number][];
  }[];
  /** Bundles each template read, besides base */
  languages: Record<string, string[]>;
}

/** Never downloaded whole, only single files from it */
const RANGE_ONLY = "misc";
/**
 * A file this far past what a stream has received is fetched on its own
 * instead, since waiting would take longer than a request (about 0.3 s at
 * 50 Mbps).
 */
const AHEAD = 2 * 1024 * 1024;
const CACHE = "sandbox-bundles";

/** The part of v86's 9p storage that fetches files */
interface Storage {
  load_from_server(name: string, size: number): Promise<Uint8Array>;
  zstd_decompress(size: number, data: Uint8Array): ArrayBuffer;
  cache(name: string, data: Uint8Array): Promise<void>;
}

class Bundle {
  private data: Uint8Array | undefined;
  private received = 0;
  private started = false;
  private failed = false;
  private waiters: { end: number; resolve: (ok: boolean) => void }[] = [];

  constructor(
    readonly name: string,
    readonly url: string,
    private size: number
  ) {}

  /** Starts streaming the whole bundle, once */
  start() {
    if (this.started || this.name === RANGE_ONLY) return;
    this.started = true;
    void this.stream().catch((error) => {
      console.warn(
        `Bundle ${this.name} failed, fetching files one by one`,
        error
      );
      this.failed = true;
      this.wake();
    });
  }

  async read(offset: number, size: number): Promise<Uint8Array> {
    this.start();
    const end = offset + size;
    if (this.data && this.received >= end)
      return this.data.subarray(offset, end);
    if (this.started && !this.failed && offset - this.received < AHEAD) {
      const ok = await new Promise<boolean>((resolve) =>
        this.waiters.push({ end, resolve })
      );
      if (ok) return this.data!.subarray(offset, end);
    }
    return this.range(offset, size);
  }

  private async stream() {
    const res = await cachedFetch(this.url);
    const reader = res.body!.getReader();
    this.data = new Uint8Array(this.size);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      this.data.set(value, this.received);
      this.received += value.length;
      this.wake();
    }
    if (this.received !== this.size)
      throw new Error(`got ${this.received} of ${this.size} bytes`);
  }

  private wake() {
    this.waiters = this.waiters.filter(({ end, resolve }) => {
      if (this.failed) resolve(false);
      else if (this.received >= end) resolve(true);
      else return true;
      return false;
    });
  }

  /** One file's bytes on their own */
  async range(offset: number, size: number): Promise<Uint8Array> {
    const res = await fetch(this.url, {
      headers: { Range: `bytes=${offset}-${offset + size - 1}` },
    });
    const data = new Uint8Array(await res.arrayBuffer());
    // A server without range support sends the whole bundle
    return res.status === 206 ? data : data.subarray(offset, offset + size);
  }
}

/** A cached copy if there is one, otherwise the network, saved for next time */
async function cachedFetch(url: string): Promise<Response> {
  // Cache Storage only exists on https and localhost
  const cache = await globalThis.caches?.open(CACHE).catch(() => undefined);
  const hit = await cache?.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  void cache?.put(url, res.clone()).catch(() => {});
  return res;
}

export class Bundles {
  private where = new Map<
    string,
    { bundle: Bundle; offset: number; size: number }
  >();
  private byName = new Map<string, Bundle>();

  private constructor(
    private index: Index,
    base: string
  ) {
    for (const { name, url, size, files } of index.bundles) {
      const bundle = new Bundle(name, new URL(url, base).href, size);
      this.byName.set(name, bundle);
      let offset = 0;
      for (const [file, size] of files) {
        this.where.set(`${file}.bin.zst`, { bundle, offset, size });
        offset += size;
      }
    }
    void this.dropOldBundles();
  }

  /** Undefined when the image was built without bundles */
  static async load(base: string): Promise<Bundles | undefined> {
    try {
      const res = await fetch(`${base}bundles.json`);
      // Vite's dev server answers missing files with index.html
      if (!res.ok || res.headers.get("content-type")?.includes("text/html"))
        return undefined;
      return new Bundles(await res.json(), new URL(base, location.href).href);
    } catch {
      return undefined;
    }
  }

  /** Starts downloading a bundle, like base right after boot */
  prefetch(name: string) {
    this.byName.get(name)?.start();
  }

  /** Starts downloading what a language's template read */
  prefetchLanguage(id: string) {
    for (const name of this.index.languages[id] ?? []) this.prefetch(name);
  }

  /**
   * Makes v86 read files from bundles. Files not in one, like the days'
   * inputs, still come from the site one by one.
   */
  hook(storage: Storage) {
    const load = storage.load_from_server.bind(storage);
    storage.load_from_server = async (name, size) => {
      const decompress = (compressed: Uint8Array) =>
        new Uint8Array(storage.zstd_decompress(size, compressed));
      const file = this.where.get(name);
      if (!file) return load(name, size);
      const { bundle, offset, size: length } = file;
      let data: Uint8Array;
      try {
        data = decompress(await bundle.read(offset, length));
      } catch (error) {
        // A guest read that fails would hang the program, so try once more
        // with the file on its own
        console.warn(`${name} from bundle ${bundle.name} failed`, error);
        data = decompress(await bundle.range(offset, length));
      }
      await storage.cache(name, data);
      return data;
    };
  }

  private async dropOldBundles() {
    const cache = await globalThis.caches?.open(CACHE).catch(() => undefined);
    if (!cache) return;
    const current = new Set([...this.byName.values()].map((b) => b.url));
    for (const request of await cache.keys()) {
      if (!current.has(request.url)) void cache.delete(request);
    }
  }
}
