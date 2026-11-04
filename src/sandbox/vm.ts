import { V86 } from "v86";
import wasmUrl from "v86/build/v86.wasm?url";
import { vmOptions } from "./vm-options.ts";
import { Bundles } from "./bundles.ts";

const ASSETS = `${import.meta.env.BASE_URL}sandbox/v86/`;
const SNAPSHOT_URL = `${ASSETS}alpine-state.bin.zst`;

/** The parts of v86's in-JS 9p filesystem the file service uses. */
export interface Fs9p {
  SearchPath(path: string): { id: number; parentid: number };
  GetInode(id: number): {
    size: number;
    mtime: number;
    mode: number;
    symlink?: string;
    status: number;
    sha256sum: string;
  };
  IsDirectory(id: number): boolean;
  read_dir(path: string): string[] | undefined;
  set_data(id: number, data: Uint8Array): Promise<void>;
  CreateDirectory(name: string, parentid: number): number;
  CreateFile(name: string, parentid: number): number;
  // The rest are what the guest's changes go through, which GuestSync watches
  Write(
    id: number,
    offset: number,
    count: number,
    data: Uint8Array
  ): Promise<void>;
  ChangeSize(id: number, size: number): Promise<void>;
  CreateNode(
    name: string,
    parentid: number,
    major: number,
    minor: number
  ): number;
  CreateSymlink(name: string, parentid: number, target: string): number;
  Link(parentid: number, targetid: number, name: string): number;
  Unlink(parentid: number, name: string): number;
  Rename(
    olddirid: number,
    oldname: string,
    newdirid: number,
    newname: string
  ): Promise<number>;
  storage: Parameters<Bundles["hook"]>[0];
}

/** v86 fetches an inode with this status from the image when it is read */
export const STATUS_ON_STORAGE = 2;

/**
 * v86 fetches lazy files from the image directory plus the inode's file name.
 * A relative name lets an inode point at any file on the site instead. The
 * query keeps v86 from treating a file that ends in .zst as compressed.
 */
export function storageNameForSiteUrl(url: string) {
  // The image directory is <base>/sandbox/v86/alpine-rootfs-flat/
  return `../../../${url}?raw`;
}

export type Emulator = V86 & { fs9p: Fs9p };

/**
 * Instructions the guest has run. v86's counter is 32 bits and wraps within a
 * minute at full speed, so it is read often and the wraps are added back.
 *
 * It also estimates the guest's background work, like timer interrupts, which
 * runs at a steady rate per real second whatever else is happening. Runs
 * subtract it, so a slower browser does not add to a program's count.
 */
export class InstructionCounter {
  private total = 0;
  private last = 0;
  /** Instructions per millisecond in recent idle seconds */
  private idleRates: number[] = [];
  private sample = { at: performance.now(), count: 0 };
  private lastActivity = 0;
  /**
   * Background instructions per millisecond while the guest is busy, which is
   * more than when idle (the kernel stops its timer tick then). Measured by
   * `sb`'s calibration runs; until then the idle rate stands in.
   */
  busyRate: number | undefined;

  constructor(private vm: Emulator) {
    setInterval(() => this.sampleIdle(), 1000);
  }

  /** Something other than background work happened, like terminal output */
  activity() {
    this.lastActivity = performance.now();
  }

  /** Background instructions per millisecond, as well as it is known */
  get backgroundRate(): number {
    return this.busyRate ?? this.idleRate;
  }

  /**
   * Background instructions per millisecond while idle. A low percentile,
   * since a second that looked idle may have had silent work in it.
   */
  get idleRate(): number {
    const sorted = this.idleRates.toSorted((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 4)] ?? 0;
  }

  private sampleIdle() {
    const at = performance.now();
    const count = this.read();
    // Only whole seconds with nothing going on, and not slowed down timers in
    // a background tab
    if (this.lastActivity < this.sample.at && at - this.sample.at < 1500) {
      this.idleRates.push((count - this.sample.count) / (at - this.sample.at));
      if (this.idleRates.length > 30) this.idleRates.shift();
    }
    this.sample = { at, count };
  }

  /** Call after restoring a snapshot, which moves v86's counter */
  resync() {
    this.last = this.vm.get_instruction_counter();
  }

  read(): number {
    const now = this.vm.get_instruction_counter();
    this.total += (now - this.last) >>> 0;
    this.last = now;
    return this.total;
  }
}

export function createVm(
  snapshot: ArrayBuffer | undefined,
  bundles: Bundles | undefined
): Emulator {
  const vm = new V86({
    ...vmOptions(ASSETS, { snapshot: !!snapshot }),
    wasm_path: wasmUrl,
    ...(snapshot && { initial_state: { buffer: snapshot } }),
  }) as Emulator;
  if (bundles) {
    // Before the snapshot is restored and the guest reads anything
    vm.add_listener("emulator-ready", () => bundles.hook(vm.fs9p.storage));
    vm.add_listener("emulator-loaded", () => bundles.prefetch("base"));
  }
  return vm;
}

/** The image's bundles, if it was built with them */
export const fetchBundles = () => Bundles.load(ASSETS);

/**
 * Downloads the saved VM state, if one was built. Returns undefined when the
 * file is missing so the page can fall back to a cold boot.
 */
export async function fetchSnapshot(): Promise<ArrayBuffer | undefined> {
  const res = await fetch(SNAPSHOT_URL);
  // Vite's dev server answers missing files with index.html
  if (!res.ok || res.headers.get("content-type")?.includes("text/html"))
    return undefined;
  return res.arrayBuffer();
}
