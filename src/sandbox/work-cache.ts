// The files someone edits in the sandbox, kept in localStorage so a reload
// brings them back. The VM itself starts from the snapshot every time.
//
// Work is kept per context: the day the sandbox was opened for (?day=02), or
// "home" without one. The same file, like /workspace/go/main.go, can hold day
// 1's solution under day 1 and day 2's under day 2.

interface Saved {
  /** Contents of every file edited in this context, by VM path */
  files: Record<string, string>;
  /** File tabs open, in order */
  open: string[];
  active?: string | undefined;
}

const PREFIX = "wcf-sandbox-work:";
/** Bigger files are not kept; localStorage holds about 5 MB per site */
const MAX_FILE_CHARS = 500_000;
const SAVE_DELAY_MS = 500;

/** The context a sandbox URL's parameters open in */
export function contextOf(params: URLSearchParams): string {
  const day = params.get("day");
  return day && /^\d+$/.test(day) ? `day-${day.padStart(2, "0")}` : "home";
}

export class WorkCache {
  private readonly key: string;
  private data: Saved;
  /** Files edited since the last save, read when it runs */
  private pending = new Map<string, () => string>();
  private timer?: ReturnType<typeof setTimeout>;
  /** Off until the saved work is restored, so startup can't overwrite it */
  private recording = false;
  /** Called once if the browser refuses to store more */
  onFull?: () => void;
  private warned = false;

  constructor(context: string) {
    this.key = PREFIX + context;
    this.data = this.load();
  }

  private load(): Saved {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) ?? "null");
      if (saved && typeof saved.files === "object" && Array.isArray(saved.open))
        return saved;
    } catch {
      // Unreadable or blocked storage: start fresh
    }
    return { files: {}, open: [] };
  }

  /** The saved files and tabs, to restore from */
  get saved(): Readonly<Saved> {
    return this.data;
  }

  /** Whether a file has been edited in this context */
  has(path: string): boolean {
    return path in this.data.files || this.pending.has(path);
  }

  /** Starts keeping changes, once the saved work has been restored */
  start() {
    this.recording = true;
  }

  /** A file changed; `read` gets its text when the save runs */
  edited(path: string, read: () => string) {
    if (!this.recording) return;
    this.pending.set(path, read);
    this.schedule();
  }

  /** The file tabs open now, and the active one */
  tabs(open: string[], active: string | undefined) {
    if (!this.recording) return;
    if (
      open.length === this.data.open.length &&
      open.every((p, i) => p === this.data.open[i]) &&
      active === this.data.active
    )
      return;
    this.data.open = open;
    this.data.active = active;
    this.schedule();
  }

  /** Forgets the edited files, as after restoring the VM snapshot */
  clearFiles() {
    this.pending.clear();
    this.data.files = {};
    this.flush();
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
  }

  /** Saves now, for when a tab closes or the page goes away */
  flush() {
    clearTimeout(this.timer);
    for (const [path, read] of this.pending) {
      try {
        const text = read();
        if (text.length <= MAX_FILE_CHARS) this.data.files[path] = text;
        else delete this.data.files[path];
      } catch {
        // Its model was disposed already; keep what was saved before
      }
    }
    this.pending.clear();
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch {
      if (!this.warned) {
        this.warned = true;
        this.onFull?.();
      }
    }
  }
}
