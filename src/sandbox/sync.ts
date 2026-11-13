import type { Emulator } from "./vm";

/** The serial port sb-agent listens on in the guest (ttyS2) */
const AGENT_PORT = 2;
/** Give up on an answer after this long, so a missing agent can't hold saves */
const AGENT_TIMEOUT_MS = 5000;
/** At most this often the editor hears about the guest's writes */
const CHANGE_DELAY_MS = 150;
/** Dragging a sash resizes a terminal many times; only the last size goes */
const RESIZE_DELAY_MS = 100;

export interface GuestChanges {
  /** Inodes whose contents the guest wrote or truncated */
  written: Set<number>;
  /** Names the guest renamed over, as `parentId/name` */
  replaced: Set<string>;
  /** Directories the guest added to or removed from */
  dirs: Set<number>;
}

/**
 * Keeps the editor and the guest in step both ways, so nobody runs `sb sync`.
 *
 * Editor to guest: FileService stages each save in /.sb, then this asks
 * sb-agent in the guest to apply it, over a serial port nothing else uses.
 * While that is on its way the guest still has the old file, so its writes
 * to the file are not news for the editor.
 *
 * Guest to editor: the guest's writes all reach v86's 9p server, which runs
 * in this page, so wrapping its methods sees every change as it happens, with
 * nothing polling in the guest. Changes are collected by inode and handed on
 * in batches, so a build writing thousands of files costs a few Set adds per
 * write here.
 */
export class GuestSync {
  /** Saves staged since the last request to sb-agent */
  private staged = new Set<string>();
  /** Saves the request on its way covers */
  private applying = new Set<string>();
  private inFlight: ReturnType<typeof setTimeout> | undefined;
  private line = "";
  private changes: GuestChanges = emptyChanges();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private resizeTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private vm: Emulator,
    private onChange: (changes: GuestChanges) => void
  ) {
    vm.add_listener(`serial${AGENT_PORT}-output-byte`, (byte: number) => {
      if (byte !== 10) {
        this.line += String.fromCharCode(byte);
        return;
      }
      if (this.line.trim() === "applied") this.applied();
      this.line = "";
    });
    // fs9p exists from here, before a snapshot is restored into it
    vm.add_listener("emulator-ready", () => this.watch());
  }

  /** Called once a save is staged: has sb-agent apply it */
  saved(path: string) {
    this.staged.add(path);
    if (!this.inFlight) this.request();
  }

  /** Whether the guest may still have an older copy than the editor saved */
  isApplying(path: string) {
    return this.staged.has(path) || this.applying.has(path);
  }

  /**
   * Tells the guest a terminal's size, as a terminal emulator does with a
   * pseudo-terminal, so the program in front gets SIGWINCH. A serial line
   * has no way to carry it.
   */
  resize(port: 0 | 1, rows: number, cols: number) {
    clearTimeout(this.resizeTimers.get(port));
    this.resizeTimers.set(
      port,
      setTimeout(() => {
        this.resizeTimers.delete(port);
        this.vm.serial_send_bytes(
          AGENT_PORT,
          new TextEncoder().encode(`size ${port} ${rows} ${cols}\n`)
        );
      }, RESIZE_DELAY_MS)
    );
  }

  /**
   * Hangs up a terminal the page closed, ending its shell and anything
   * running in it. The guest starts a fresh login there.
   */
  hangUp(port: 0 | 1) {
    clearTimeout(this.resizeTimers.get(port));
    this.resizeTimers.delete(port);
    this.vm.serial_send_bytes(
      AGENT_PORT,
      new TextEncoder().encode(`close ${port}\n`)
    );
  }

  private request() {
    this.applying = this.staged;
    this.staged = new Set();
    this.inFlight = setTimeout(() => this.applied(), AGENT_TIMEOUT_MS);
    this.vm.serial_send_bytes(AGENT_PORT, new Uint8Array([10]));
  }

  private applied() {
    clearTimeout(this.inFlight);
    this.inFlight = undefined;
    this.applying.clear();
    // Saves that came in while it worked need another pass
    if (this.staged.size) this.request();
  }

  private watch() {
    const fs = this.vm.fs9p;
    const note = <A extends unknown[], R>(
      method: (...args: A) => R,
      record: (...args: A) => void
    ) =>
      function (this: unknown, ...args: A): R {
        record(...args);
        return method.apply(this, args);
      };
    const changes = () => {
      this.timer ??= setTimeout(() => this.flush(), CHANGE_DELAY_MS);
      return this.changes;
    };
    const dir = (parentId: number) => changes().dirs.add(parentId);

    fs.Write = note(fs.Write, (id) => changes().written.add(id));
    fs.ChangeSize = note(fs.ChangeSize, (id) => changes().written.add(id));
    fs.CreateFile = note(fs.CreateFile, (_, parentId) => dir(parentId));
    fs.CreateDirectory = note(fs.CreateDirectory, (_, parentId) =>
      dir(parentId)
    );
    fs.CreateNode = note(fs.CreateNode, (_, parentId) => dir(parentId));
    fs.CreateSymlink = note(fs.CreateSymlink, (_, parentId) => dir(parentId));
    fs.Link = note(fs.Link, (parentId) => dir(parentId));
    fs.Unlink = note(fs.Unlink, (parentId) => dir(parentId));
    fs.Rename = note(fs.Rename, (oldDir, _, newDir, newName) => {
      const c = changes();
      c.dirs.add(oldDir).add(newDir);
      // Editors and `sed -i` save by renaming a new file over the old one
      c.replaced.add(`${newDir}/${newName}`);
    });
  }

  private flush() {
    this.timer = undefined;
    const changes = this.changes;
    this.changes = emptyChanges();
    this.onChange(changes);
  }
}

const emptyChanges = (): GuestChanges => ({
  written: new Set(),
  replaced: new Set(),
  dirs: new Set(),
});
