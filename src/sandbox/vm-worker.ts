// Runs the VM in a worker, so the page's rendering, editor and layout never
// take time from the emulator, and the emulator never makes the page stutter.
// The page talks to it through vm-client.ts; vm-protocol.ts has the messages.
import { addContent } from "./content";
import { FileService } from "./files";
import { watchGuestWrites } from "./sync";
import {
  createVm,
  fetchBundles,
  fetchSnapshot,
  InstructionCounter,
  restoreSnapshot,
  type Emulator,
} from "./vm";
import type { Calls, FromWorker, SerialItem, ToWorker } from "./vm-protocol";

/** `sb`'s markers: ESC ] 7771 ; NAME BEL (see terminal.ts) */
const MARKER = "\x1b]7771;";
/**
 * OSC 52, the clipboard: ESC ] 52 ; c ; BASE64 BEL copies, and "?" in place
 * of the text asks for the clipboard. Split out here rather than left to the
 * terminal, so it works whichever terminal draws the output.
 */
const CLIPBOARD = "\x1b]52;";
/** Longer markers are some other escape sequence */
const MAX_MARKER = 32;
/** Bigger copies are dropped, like pastes over 1 MB (see terminal.ts) */
const MAX_CLIPBOARD = 1.5e6;
/** Serial ports with a terminal, whose output carries `sb`'s markers */
const TERMINAL_PORTS = [0, 1] as const;
/** The port sb-agent talks on, passed through as plain bytes */
const AGENT_PORT = 2;

const post = (message: FromWorker, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

let vm: Emulator;
let files: FileService;
let counter: InstructionCounter;
let snapshot: ArrayBuffer | undefined;
let bundles: Awaited<ReturnType<typeof fetchBundles>>;

/**
 * Collects a serial port's output, splitting out `sb`'s markers with the
 * instruction count at the byte that ends each, and the clipboard sequences,
 * and posts it once a frame.
 * Bytes arrive one at a time from v86; one message per byte would cost more
 * than the terminal's drawing.
 */
class SerialOut {
  private bytes: number[] = [];
  private items: SerialItem[] = [];
  /** Bytes that may be the start of a marker or clipboard sequence */
  private escape = "";
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private port: 0 | 1 | 2,
    private markers: boolean
  ) {
    vm.add_listener(`serial${port}-output-byte`, (byte: number) =>
      this.receive(byte)
    );
  }

  private receive(byte: number) {
    counter.activity();
    if (this.markers && (this.escape || byte === 0x1b)) {
      this.escape += String.fromCharCode(byte);
      const prefix = [MARKER, CLIPBOARD].find((p) => this.escape.startsWith(p));
      if (!prefix) {
        if (MARKER.startsWith(this.escape) || CLIPBOARD.startsWith(this.escape))
          return;
      } else {
        // Ended by BEL, or by ST (ESC \)
        const end =
          byte === 0x07
            ? 1
            : byte === 0x5c && this.escape.at(-2) === "\x1b"
              ? 2
              : 0;
        if (end) {
          this.endData();
          const body = this.escape.slice(prefix.length, -end);
          this.items.push(
            prefix === MARKER
              ? {
                  kind: "marker",
                  marker: body,
                  count: counter.read(),
                  at: performance.now(),
                }
              : { kind: "clipboard", data: body }
          );
          this.escape = "";
          this.schedule();
          return;
        }
        const max = prefix === MARKER ? MAX_MARKER : MAX_CLIPBOARD;
        if (this.escape.length < max) return;
      }
      // Some other escape sequence
      for (const c of this.escape) this.bytes.push(c.charCodeAt(0));
      this.escape = "";
    } else {
      this.bytes.push(byte);
    }
    this.schedule();
  }

  private endData() {
    if (!this.bytes.length) return;
    this.items.push({ kind: "data", bytes: new Uint8Array(this.bytes) });
    this.bytes = [];
  }

  private schedule() {
    this.timer ??= setTimeout(() => this.flush(), 16);
  }

  private flush() {
    this.timer = undefined;
    this.endData();
    const items = this.items;
    this.items = [];
    post(
      { type: "serial", port: this.port, items },
      items.flatMap((item) =>
        item.kind === "data" ? [item.bytes.buffer as ArrayBuffer] : []
      )
    );
  }

  /** Drops what hasn't been sent, after a snapshot restore */
  reset() {
    this.bytes = [];
    this.items = [];
    this.escape = "";
  }
}

let serials: SerialOut[] = [];

const calls: {
  [M in keyof Calls]: (...args: Parameters<Calls[M]>) => unknown;
} = {
  exists: (path) => files.exists(path),
  isDir: (path) => files.isDir(path),
  list: (dir) => files.list(dir),
  tree: (roots, expanded) => files.tree(roots, expanded),
  listAll: (roots) => files.listAll(roots),
  resolveFile: (path) => files.resolveFile(path),
  size: (path) => files.size(path),
  locate: (path) => files.locate(path),
  readBytes: (path) => files.readBytes(path),
  write: (path, contents) => files.write(path, contents),
  mkdir: (path) => files.mkdir(path),
  addContent: (content) => addContent(files, content),
  reset: async () => {
    await restoreSnapshot(vm, snapshot!);
    counter.resync();
    serials.forEach((s) => s.reset());
  },
  prefetchLanguage: (id) => bundles?.prefetchLanguage(id),
};

async function start(fresh: boolean) {
  const bundlesPromise = fetchBundles();
  snapshot = fresh ? undefined : await fetchSnapshot();
  post({ type: "snapshot", present: !!snapshot });
  bundles = await bundlesPromise;
  vm = createVm(snapshot, bundles);
  files = new FileService(vm);
  counter = new InstructionCounter(vm);
  counter.onIdleRate = (rate) => post({ type: "idle-rate", rate });
  serials = [
    ...TERMINAL_PORTS.map((port) => new SerialOut(port, true)),
    new SerialOut(AGENT_PORT, false),
  ];
  // fs9p exists from here, before a snapshot is restored into it
  vm.add_listener("emulator-ready", () =>
    watchGuestWrites(vm.fs9p, (changes) =>
      post({
        type: "changes",
        written: [...changes.written],
        replaced: [...changes.replaced],
        dirs: [...changes.dirs],
      })
    )
  );
  vm.add_listener("download-progress", (e) =>
    post({
      type: "download-progress",
      fileName: e.file_name,
      loaded: e.loaded,
      total: e.total,
      lengthComputable: e.lengthComputable,
    })
  );
  // emulator-ready fires before the snapshot is restored, emulator-loaded after
  vm.add_listener("emulator-loaded", () => {
    counter.resync();
    post({ type: "loaded" });
  });
  if (import.meta.env.DEV) Object.assign(self, { vm });
}

// The page's metrics count what the VM downloads; this worker's fetches
// don't show up in the page's resource timings
new PerformanceObserver((list) => {
  let bytes = 0;
  for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
    if (entry.name.includes("/v86/") || entry.name.includes("/day/"))
      bytes += entry.transferSize;
  }
  if (bytes) post({ type: "bytes", bytes });
}).observe({ type: "resource", buffered: true });

/** Calls run one at a time, in the order the page sent them */
let queue = Promise.resolve();

onmessage = ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === "start") {
    void start(data.fresh);
  } else if (data.type === "input") {
    counter.activity();
    vm.serial_send_bytes(data.port, data.bytes);
  } else if (data.type === "call") {
    queue = queue.then(async () => {
      try {
        const fn = calls[data.method] as (...args: unknown[]) => unknown;
        post({ type: "result", id: data.id, value: await fn(...data.args) });
      } catch (error) {
        post({ type: "result", id: data.id, error: String(error) });
      }
    });
  }
};
