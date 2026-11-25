// The page's side of the VM, which runs in vm-worker.ts. Everything that
// reads the VM's state is a message there and back, so it's async.
import type { Entry, TreeEntry } from "./files";
import type { GuestChanges } from "./sync";
import type {
  Calls,
  FromWorker,
  Method,
  SerialItem,
  ToWorker,
} from "./vm-protocol";

type Async<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

export interface DownloadProgress {
  fileName: string;
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

/**
 * What the page knows of the worker's InstructionCounter (see vm.ts): counts
 * come with each marker, and the idle rate once a second.
 */
export class CounterView {
  idleRate = 0;
  /** Measured on the page by `sb`'s calibration runs (see terminal.ts) */
  busyRate: number | undefined;

  get backgroundRate(): number {
    return this.busyRate ?? this.idleRate;
  }
}

export class VmClient {
  private worker = new Worker(new URL("./vm-worker.ts", import.meta.url), {
    type: "module",
  });
  private nextId = 0;
  private waiting = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private serial = new Map<number, ((items: SerialItem[]) => void)[]>();
  private snapshotAnswer!: (present: boolean) => void;
  private loadedAnswer!: () => void;

  readonly counter = new CounterView();
  /** Whether a snapshot was found, once the worker has looked */
  readonly snapshot = new Promise<boolean>(
    (resolve) => (this.snapshotAnswer = resolve)
  );
  /** Resolves once the VM has booted or restored its snapshot */
  readonly loaded = new Promise<void>(
    (resolve) => (this.loadedAnswer = resolve)
  );
  onChanges?: (changes: GuestChanges) => void;
  onDownloadProgress?: (progress: DownloadProgress) => void;
  /** Bytes the worker downloaded for the VM */
  onBytes?: (bytes: number) => void;

  constructor(fresh: boolean) {
    this.worker.onmessage = ({ data }: MessageEvent<FromWorker>) =>
      this.receive(data);
    this.worker.onerror = (e) => console.error("VM worker:", e.message);
    this.post({ type: "start", fresh });
  }

  private post(message: ToWorker, transfer: Transferable[] = []) {
    this.worker.postMessage(message, transfer);
  }

  private receive(data: FromWorker) {
    switch (data.type) {
      case "snapshot":
        return this.snapshotAnswer(data.present);
      case "loaded":
        return this.loadedAnswer();
      case "serial":
        return this.serial.get(data.port)?.forEach((fn) => fn(data.items));
      case "changes":
        return this.onChanges?.({
          written: new Set(data.written),
          replaced: new Set(data.replaced),
          dirs: new Set(data.dirs),
        });
      case "idle-rate":
        this.counter.idleRate = data.rate;
        return;
      case "bytes":
        return this.onBytes?.(data.bytes);
      case "download-progress":
        return this.onDownloadProgress?.(data);
      case "result": {
        const call = this.waiting.get(data.id);
        this.waiting.delete(data.id);
        if (data.error !== undefined) call?.reject(new Error(data.error));
        else call?.resolve(data.value);
      }
    }
  }

  /** Calls `fn` with each batch of a serial port's output */
  onSerial(port: number, fn: (items: SerialItem[]) => void) {
    this.serial.set(port, [...(this.serial.get(port) ?? []), fn]);
  }

  /** Types bytes into a serial port */
  send(port: number, bytes: Uint8Array) {
    this.post({ type: "input", port, bytes });
  }

  call<M extends Method>(
    method: M,
    ...args: Parameters<Calls[M]>
  ): Promise<Awaited<ReturnType<Calls[M]>>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.post({ type: "call", id, method, args });
    });
  }
}

/** The FileService methods the page calls */
type FileCalls = Pick<
  Calls,
  | "exists"
  | "isDir"
  | "list"
  | "tree"
  | "listAll"
  | "resolveFile"
  | "size"
  | "locate"
  | "readBytes"
  | "write"
  | "mkdir"
>;

/**
 * FileService (files.ts) from the page, through the worker. Calls run in the
 * order they are made.
 */
export class FilesClient implements Async<FileCalls> {
  /** Called after each write is staged */
  onStaged?: (path: string) => void;

  constructor(private vm: VmClient) {}

  exists = (path: string) => this.vm.call("exists", path);
  isDir = (path: string) => this.vm.call("isDir", path);
  list = (dir: string): Promise<Entry[]> => this.vm.call("list", dir);
  tree = (
    roots: string[],
    expanded: string[]
  ): Promise<Record<string, TreeEntry[]>> =>
    this.vm.call("tree", roots, expanded);
  listAll = (roots: string[]) => this.vm.call("listAll", roots);
  resolveFile = (path: string) => this.vm.call("resolveFile", path);
  size = (path: string) => this.vm.call("size", path);
  locate = (path: string) => this.vm.call("locate", path);
  readBytes = (path: string) => this.vm.call("readBytes", path);
  mkdir = (path: string) => this.vm.call("mkdir", path);

  async read(path: string): Promise<string> {
    return new TextDecoder().decode(await this.readBytes(path));
  }

  async write(path: string, contents: string | Uint8Array) {
    await this.vm.call("write", path, contents);
    this.onStaged?.(path);
  }
}
