// Messages between the page (vm-client.ts) and the worker that runs the VM
// (vm-worker.ts).
import type { ContentFile } from "./content";
import type { Entry, TreeEntry } from "./files";

/** What the page asks the worker to do, and what each answers */
export interface Calls {
  exists(path: string): boolean;
  isDir(path: string): boolean;
  list(dir: string): Entry[];
  tree(roots: string[], expanded: string[]): Record<string, TreeEntry[]>;
  listAll(roots: string[]): string[];
  resolveFile(path: string): string | undefined;
  size(path: string): number;
  locate(path: string): { id: number; parentid: number };
  readBytes(path: string): Uint8Array;
  write(path: string, contents: string | Uint8Array): void;
  mkdir(path: string): void;
  addContent(content: ContentFile[]): void;
  /** Restores the snapshot the VM started from */
  reset(): void;
  prefetchLanguage(id: string): void;
}

export type Method = keyof Calls;

export type ToWorker =
  | { type: "start"; fresh: boolean }
  | { type: "input"; port: number; bytes: Uint8Array }
  | {
      type: "call";
      id: number;
      method: Method;
      args: unknown[];
    };

/** A serial port's output, in order: bytes, and `sb`'s markers between them */
export type SerialItem =
  | { kind: "data"; bytes: Uint8Array }
  /**
   * ESC ] 7771 ; MARKER BEL, with the instruction count and the worker's
   * clock at the moment it was printed. Only differences between two clock
   * readings mean anything, since the worker's clock starts at its own time.
   */
  | { kind: "marker"; marker: string; count: number; at: number }
  /** OSC 52, what follows ESC ] 52 ; such as "c;BASE64" or "c;?" */
  | { kind: "clipboard"; data: string };

export type FromWorker =
  | { type: "snapshot"; present: boolean }
  | {
      type: "download-progress";
      fileName: string;
      loaded: number;
      total: number;
      lengthComputable: boolean;
    }
  | { type: "loaded" }
  | { type: "serial"; port: number; items: SerialItem[] }
  /** The guest's writes since the last batch (see GuestSync) */
  | { type: "changes"; written: number[]; replaced: string[]; dirs: number[] }
  /** Background instructions per millisecond in recent idle seconds */
  | { type: "idle-rate"; rate: number }
  /** Bytes the worker downloaded for the VM, for the page's metrics */
  | { type: "bytes"; bytes: number }
  | { type: "result"; id: number; value?: unknown; error?: string };
