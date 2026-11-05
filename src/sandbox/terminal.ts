import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { Emulator, InstructionCounter } from "./vm";

/** Matches the shell prompt set in the image's .profile, e.g. "/workspace/go $ " */
const PROMPT = /\/\S* [#$] $/;
/** ash follows its prompt with a cursor position query (ESC [6n) */
const ESCAPES = /\x1b\[[0-9;?]*[A-Za-z]/g;

/**
 * `sb` prints ESC ] 7771 ; NAME BEL around the code it measures: "start" and
 * "end" around a run, "reset" before a set of runs and "report" where the
 * count goes in its summary line. Runs between "baseline" and "measure" are of
 * a program that only exits, whose count is subtracted from the others. The
 * two runs between "calibrate N" and "measure" are N instructions apart, and
 * the rest of their difference is background work. Markers are read here, as
 * the serial port sends them, so the count stops at the instruction that
 * printed the marker.
 */
const MARKER = "\x1b]7771;";

const encoder = new TextEncoder();

/** Text a terminal asked to copy, waiting for a click because the browser refused */
let pendingCopy: string | undefined;

/**
 * Puts text from the guest on the clipboard. Firefox only allows that right
 * after a click or key press, and Chrome while the page has focus, so when it
 * is refused the next click in the page copies it instead.
 */
function copyFromGuest(text: string, status: (text: string) => void) {
  navigator.clipboard.writeText(text).catch(() => {
    if (pendingCopy === undefined) {
      document.addEventListener(
        "pointerdown",
        () => {
          const text = pendingCopy!;
          pendingCopy = undefined;
          navigator.clipboard.writeText(text).then(
            () => status("Copied to the clipboard"),
            () => status("The browser didn't allow copying to the clipboard")
          );
        },
        { once: true, capture: true }
      );
    }
    pendingCopy = text;
    status("Click anywhere to copy what the terminal sent to the clipboard");
  });
}
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumSignificantDigits: 4,
});

export const TERMINAL_THEMES: Record<"wcf" | "dark", ITheme> = {
  wcf: {
    background: "#f6f9ff",
    foreground: "#333333",
    cursor: "#333333",
    cursorAccent: "#f6f9ff",
    selectionBackground: "#b9d1ff",
    // Same as --scrollbar in style.css
    scrollbarSliderBackground: "#5d7dba40",
    scrollbarSliderHoverBackground: "#5d7dba66",
    scrollbarSliderActiveBackground: "#5d7dba99",
    // Darker than xterm's defaults so colored output reads on a light background
    black: "#333333",
    red: "#c0303f",
    green: "#2b7a3b",
    yellow: "#8a6400",
    blue: "#3a4fa0",
    magenta: "#8b3fa0",
    cyan: "#1a7480",
    white: "#5c5c5c",
    brightBlack: "#5c5c5c",
    brightWhite: "#1f1f1f",
  },
  dark: {
    background: "#0d121b",
    foreground: "#c4cfdf",
    cursor: "#c4cfdf",
    cursorAccent: "#0d121b",
    selectionBackground: "#2a4170",
    scrollbarSliderBackground: "#4d6ba844",
    scrollbarSliderHoverBackground: "#4d6ba866",
    scrollbarSliderActiveBackground: "#4d6ba899",
    black: "#1c2636",
    red: "#f08090",
    green: "#8fd4a0",
    yellow: "#e8c97a",
    blue: "#8fb3ff",
    magenta: "#c8a0f0",
    cyan: "#7fd4d4",
    white: "#c4cfdf",
    brightBlack: "#5a6a86",
    brightWhite: "#eef3fb",
  },
};

/** One measured run: v86's instruction count and the real time it took */
interface Sample {
  instructions: number;
  ms: number;
}

const median = (values: number[]) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];

/** An xterm.js terminal attached to one of the VM's serial ports. */
export class SerialTerminal {
  readonly term = new Terminal({
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontSize: 13,
    cursorBlink: true,
    scrollback: 5000,
  });
  private fit = new FitAddon();
  private pending: number[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private tail = "";
  private promptWaiters: (() => void)[] = [];
  /** Bytes that may be the start of a marker */
  private marker = "";
  private runStart = { count: 0, at: 0 };
  /** Where runs go: the measured program, or one of the estimates' */
  private phase: "runs" | "baseline" | "calibrate" = "runs";
  private calibrationInstructions = 0;
  private samples: Record<typeof this.phase, Sample[]> = {
    runs: [],
    baseline: [],
    calibrate: [],
  };

  constructor(
    private vm: Emulator,
    private port: 0 | 1,
    readonly element: HTMLElement,
    private counter: InstructionCounter,
    status: (text: string) => void
  ) {
    this.term.loadAddon(this.fit);
    this.term.open(element);
    // OSC 52 copies to the clipboard: ESC ] 52 ; c ; BASE64 BEL. The image's
    // wl-copy, xclip, xsel and pbcopy send it, and so can tmux and Neovim.
    // Reading the clipboard ("?" instead of the text) isn't supported.
    this.term.parser.registerOscHandler(52, (data) => {
      const base64 = data.slice(data.indexOf(";") + 1);
      if (base64 === "?") return true;
      try {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        copyFromGuest(new TextDecoder().decode(bytes), status);
      } catch {
        // Not base64; ignored like any unknown sequence
      }
      return true;
    });
    // Ctrl+Shift+C and Ctrl+Shift+V copy and paste, as in VS Code's and
    // Linux terminals, where Ctrl+C and Ctrl+V go to the program
    this.term.attachCustomKeyEventHandler((event) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey)
        return true;
      if (event.code === "KeyC") {
        // Also keeps Chrome from opening its element inspector
        event.preventDefault();
        if (event.type === "keydown" && this.term.hasSelection())
          void navigator.clipboard.writeText(this.term.getSelection());
        return false;
      }
      // Left to the browser, which pastes into xterm's textarea, so this
      // needs no clipboard permission
      return event.code !== "KeyV";
    });
    this.term.onData((data) => {
      counter.activity();
      vm.serial_send_bytes(port, encoder.encode(data));
    });
    vm.add_listener(`serial${port}-output-byte`, (byte) => this.receive(byte));
    new ResizeObserver(() => !element.hidden && this.fit.fit()).observe(
      element
    );
  }

  setTheme(theme: ITheme) {
    this.term.options.theme = theme;
  }

  get size() {
    return { rows: this.term.rows, cols: this.term.cols };
  }

  /** Type a line into the shell. */
  send(line: string) {
    this.vm.serial_send_bytes(this.port, encoder.encode(line + "\r"));
  }

  /** Resolves the next time the shell prints its prompt. */
  waitForPrompt(): Promise<void> {
    return new Promise((resolve) => this.promptWaiters.push(resolve));
  }

  focus() {
    this.term.focus();
  }

  reset() {
    this.pending = [];
    this.tail = "";
    this.marker = "";
    this.phase = "runs";
    this.samples = { runs: [], baseline: [], calibrate: [] };
    this.term.reset();
  }

  private receive(byte: number) {
    this.counter.activity();
    if (this.marker || byte === 0x1b) {
      this.marker += String.fromCharCode(byte);
      if (MARKER.startsWith(this.marker)) return;
      if (this.marker.startsWith(MARKER)) {
        if (byte === 0x07) {
          this.onMarker(this.marker.slice(MARKER.length, -1));
          this.marker = "";
          return;
        }
        if (this.marker.length < 32) return;
      }
      // Some other escape sequence
      for (const c of this.marker) this.pending.push(c.charCodeAt(0));
      this.marker = "";
    } else {
      this.pending.push(byte);
    }
    // Bytes arrive one at a time; batch them so xterm renders once per frame
    this.flushTimer ??= setTimeout(() => this.flush(), 16);
  }

  private onMarker(marker: string) {
    const [name, arg] = marker.split(" ");
    if (name === "reset") {
      this.samples.runs = [];
    } else if (name === "baseline" || name === "calibrate") {
      this.phase = name;
      this.samples[name] = [];
      this.calibrationInstructions = Number(arg);
    } else if (name === "measure") {
      if (this.phase === "calibrate") this.calibrate();
      this.phase = "runs";
    } else if (name === "start") {
      // A project's run.sh marks again once it has built
      this.runStart = { count: this.counter.read(), at: performance.now() };
    } else if (name === "end") {
      this.samples[this.phase].push({
        instructions: this.counter.read() - this.runStart.count,
        ms: performance.now() - this.runStart.at,
      });
    } else if (name === "report") {
      this.pending.push(...encoder.encode(this.describeRuns()));
    }
  }

  private calibrate() {
    const [short, long] = this.samples.calibrate;
    if (!short || !long || long.ms <= short.ms) return;
    const extra =
      long.instructions - short.instructions - this.calibrationInstructions;
    this.counter.busyRate = Math.max(0, extra / (long.ms - short.ms));
  }

  /** A run's count less the background work during it */
  private ownInstructions({ instructions, ms }: Sample) {
    return instructions - this.counter.backgroundRate * ms;
  }

  /** The program's own instructions in each run: less starting a process */
  get counts(): number[] {
    const baseline =
      median(this.samples.baseline.map((s) => this.ownInstructions(s))) ?? 0;
    return this.samples.runs.map((s) =>
      Math.max(0, Math.round(this.ownInstructions(s) - baseline))
    );
  }

  /** ", ≈12.35M instructions", or the median and range of several runs */
  describeRuns(): string {
    const counts = this.counts.toSorted((a, b) => a - b);
    if (!counts.length) return "";
    if (counts.length === 1)
      return `, ≈${compact.format(counts[0]!)} instructions`;
    return `, median ≈${compact.format(median(counts)!)} instructions (${compact.format(counts[0]!)}–${compact.format(counts.at(-1)!)})`;
  }

  private flush() {
    this.flushTimer = undefined;
    const bytes = new Uint8Array(this.pending);
    this.pending = [];
    this.term.write(bytes);

    this.tail = (
      this.tail + String.fromCharCode(...bytes.subarray(-256))
    ).slice(-256);
    if (PROMPT.test(this.tail.replace(ESCAPES, ""))) {
      const waiters = this.promptWaiters;
      this.promptWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }
}
