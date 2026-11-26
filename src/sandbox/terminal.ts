import { FitAddon, init, Terminal, type ITheme } from "ghostty-web";
import type { CounterView, VmClient } from "./vm-client";
import type { SerialItem } from "./vm-protocol";

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
 * the rest of their difference is background work. The worker running the VM
 * splits markers out as the serial port sends them, with the count at the
 * instruction that printed each (see vm-worker.ts).
 */

const encoder = new TextEncoder();

// The terminals are ghostty-web: Ghostty's terminal in WebAssembly, drawn on
// a canvas, with an API copied from xterm.js. Its wasm is inlined in its
// module, so this needs no extra request.
await init();

const MAX_PASTE_BYTES = 1e6;

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
    // Darker than the usual defaults so colored output reads on a light background
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

/** The theme colors ghostty-web's wasm terminal gives cells */
const CELL_COLORS = [
  "foreground",
  "background",
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
] as const satisfies (keyof ITheme)[];

/** "#rrggbb" as a number, as the renderer gets it in three parts */
const rgbOf = (color: string | undefined) =>
  color?.match(/^#[0-9a-f]{6}$/i) ? parseInt(color.slice(1), 16) : undefined;

/** The parts of ghostty-web's Terminal that this reaches past its API for */
interface GhosttyInternals {
  wasmTerm: { getCursor(): { y: number } };
  renderer: {
    setTheme(theme: ITheme): void;
    rgbToCSS(r: number, g: number, b: number): string;
    render(
      buffer: unknown,
      forceAll: boolean,
      viewportY: number,
      scrollback: unknown,
      scrollbarOpacity?: number
    ): void;
    cursorVisible: boolean;
    hoveredHyperlinkId: number;
    hoveredLinkRange: unknown;
    selectionManager?: { getDirtySelectionRows(): Set<number> };
    fontSize: number;
    fontFamily: string;
    ctx: CanvasRenderingContext2D;
    devicePixelRatio: number;
    metrics: { width: number; height: number; baseline: number };
    measureFont(): { width: number; height: number; baseline: number };
    remeasureFont(): void;
  };
  viewportY: number;
  scrollbarOpacity: number;
  lastCursorY: number;
  cursorMoveEmitter: { fire(): void };
  isOpen: boolean;
  isDisposed: boolean;
  startRenderLoop(): void;
}

/**
 * ghostty-web makes each row as tall as the letter M, with the baseline just
 * below M's top. Taller glyphs (accented capitals, box drawing) and
 * descenders then reach past their row: on the first row the canvas cut
 * their tops off, and redrawing a row erased the parts of its neighbors'
 * glyphs that reached into it. Rows measured from the tallest glyphs hold
 * them all. It applies to font size changes too.
 */
function fitRowsToGlyphs(renderer: GhosttyInternals["renderer"]) {
  const measure = renderer.measureFont.bind(renderer);
  renderer.measureFont = () => {
    const metrics = measure();
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${renderer.fontSize}px ${renderer.fontFamily}`;
    const glyphs = ctx.measureText("ÉÅ|│gjpqy");
    const baseline = Math.ceil(glyphs.actualBoundingBoxAscent);
    const height = baseline + Math.ceil(glyphs.actualBoundingBoxDescent);
    return {
      width: metrics.width,
      height: Math.max(height, metrics.height),
      baseline,
    };
  };
  renderer.remeasureFont();
}

/** Block elements' rectangles: [left, top, width, height] in eighths of a cell */
const BLOCKS: Record<string, [number, number, number, number]> = {
  "▀": [0, 0, 8, 4],
  "▔": [0, 0, 8, 1],
  "▐": [4, 0, 4, 8],
  "▕": [7, 0, 1, 8],
};
for (let n = 1; n <= 8; n++) {
  // ▁ to █ grow up from the bottom, ▏ to █ right from the left
  BLOCKS[String.fromCodePoint(0x2580 + n)] = [0, 8 - n, 8, n];
  BLOCKS[String.fromCodePoint(0x2590 - n)] ??= [0, 0, n, 8];
}

/**
 * Puts every rectangle the renderer fills (cell backgrounds, the cursor) on
 * whole device pixels, so neighbors share their edges rather than each half
 * covering the pixel between: at 125% or 150% that left faint lines between
 * rows and columns. Block elements (█ ▀ ▄ ▌ ▐ and the eighths) become such
 * rectangles too, filling their cell like Ghostty's and xterm.js's own,
 * rather than the font's glyphs, which never quite match the row height:
 * the chillenge 7 map viewer's half blocks meet with no gap or overlap.
 */
function drawCellsOnPixels(renderer: GhosttyInternals["renderer"]) {
  const { ctx } = renderer;
  const fillRect = ctx.fillRect.bind(ctx);
  const snap = (at: number) =>
    Math.round(at * renderer.devicePixelRatio) / renderer.devicePixelRatio;
  ctx.fillRect = (x, y, w, h) => {
    const x0 = snap(x);
    const y0 = snap(y);
    fillRect(x0, y0, snap(x + w) - x0, snap(y + h) - y0);
  };
  const fillText = ctx.fillText.bind(ctx);
  ctx.fillText = (text, x, y, maxWidth) => {
    const block = BLOCKS[text];
    if (!block) return fillText(text, x, y, maxWidth);
    const { width, height, baseline } = renderer.metrics;
    const [left, top, w, h] = block;
    ctx.fillRect(
      x + (left * width) / 8,
      y - baseline + (top * height) / 8,
      (w * width) / 8,
      (h * height) / 8
    );
  };
}

/** One measured run: v86's instruction count and the real time it took */
interface Sample {
  instructions: number;
  ms: number;
}

const median = (values: number[]) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];

/** A terminal attached to one of the VM's serial ports. */
export class SerialTerminal {
  readonly term: Terminal;
  private fit: FitAddon;
  private tail = "";
  /** The colors it opened with, which its wasm terminal keeps */
  private firstTheme: ITheme;
  private theme: ITheme;
  /** The first theme's colors, as numbers, to the current theme's (see setTheme) */
  private colors = new Map<number, string>();
  private promptWaiters: (() => void)[] = [];
  private runStart = { count: 0, at: 0 };
  /** Where runs go: the measured program, or one of the estimates' */
  private phase: "runs" | "baseline" | "calibrate" = "runs";
  private calibrationInstructions = 0;
  /** Whether the canvas is behind what it shows (see renderWhenNeeded) */
  private stale = true;
  private samples: Record<typeof this.phase, Sample[]> = {
    runs: [],
    baseline: [],
    calibrate: [],
  };

  constructor(
    private vm: VmClient,
    readonly port: 0 | 1,
    readonly element: HTMLElement,
    private counter: CounterView,
    private status: (text: string) => void,
    initial: { theme: ITheme; fontSize: number }
  ) {
    this.firstTheme = this.theme = initial.theme;
    const options = {
      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
      cursorBlink: true,
      scrollback: 5000,
      ...initial,
    };
    this.term = new Terminal(options);
    this.fit = new FitAddon();
    this.term.loadAddon(this.fit);
    this.renderWhenNeeded();
    this.term.open(element);
    const renderer = (this.term as unknown as GhosttyInternals).renderer;
    fitRowsToGlyphs(renderer);
    drawCellsOnPixels(renderer);
    const css = renderer.rgbToCSS.bind(renderer);
    renderer.rgbToCSS = (r, g, b) =>
      this.colors.get((r << 16) | (g << 8) | b) ?? css(r, g, b);
    // Ctrl+Shift+C and Ctrl+Shift+V copy and paste, as in VS Code's and
    // Linux terminals, where Ctrl+C and Ctrl+V go to the program. Unlike
    // xterm.js's, ghostty-web's handler returns whether it took the key, and
    // then also stops the browser's default for it.
    this.term.attachCustomKeyEventHandler((event) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey)
        return false;
      if (event.code !== "KeyC") {
        // Paste is left to the browser, which pastes into the terminal's
        // input, so it needs no clipboard permission
        return false;
      }
      // Taking Ctrl+Shift+C also keeps Chrome from opening its inspector
      if (this.term.hasSelection())
        void navigator.clipboard.writeText(this.term.getSelection());
      return true;
    });
    this.term.onData((data) => vm.send(port, encoder.encode(data)));
    vm.onSerial(port, (items) => this.receive(items));
    new ResizeObserver(() => {
      this.stale = true;
      if (!element.hidden) this.fit.fit();
    }).observe(element);
  }

  /**
   * ghostty-web redraws every animation frame, even with nothing new: with
   * two terminals that took over half the main thread, which the editor and
   * the browser tab share. This replaces its loop (before `open` starts it)
   * with one that only draws when something changed: output, a resize, the
   * cursor blinking, scrolling, the mouse or keys (selections and links), or
   * focus. A hidden terminal waits until it shows again.
   */
  private renderWhenNeeded() {
    const term = this.term as unknown as GhosttyInternals;
    const stale = () => (this.stale = true);
    for (const type of [
      "mousedown",
      "mousemove",
      "mouseleave",
      "wheel",
      "keydown",
      "focusin",
      "focusout",
    ])
      this.element.addEventListener(type, stale, {
        capture: true,
        passive: true,
      });
    document.addEventListener("mouseup", stale, { passive: true });
    const write = this.term.write.bind(this.term);
    this.term.write = (...args: Parameters<Terminal["write"]>) => {
      this.stale = true;
      write(...args);
    };
    let last = {
      viewportY: 0,
      opacity: 0,
      cursor: true,
      link: 0,
      range: null as unknown,
    };
    term.startRenderLoop = () => {
      const frame = () => {
        if (term.isDisposed || !term.isOpen) return;
        requestAnimationFrame(frame);
        if (this.element.hidden || !this.element.offsetParent) return;
        const r = term.renderer;
        const now = {
          viewportY: term.viewportY,
          opacity: term.scrollbarOpacity,
          cursor: r.cursorVisible,
          link: r.hoveredHyperlinkId,
          range: r.hoveredLinkRange,
        };
        const changed =
          this.stale ||
          (Object.keys(now) as (keyof typeof now)[]).some(
            (key) => now[key] !== last[key]
          ) ||
          !!r.selectionManager?.getDirtySelectionRows().size;
        if (!changed) return;
        this.stale = false;
        last = now;
        r.render(
          term.wasmTerm,
          false,
          term.viewportY,
          term,
          term.scrollbarOpacity
        );
        const { y } = term.wasmTerm.getCursor();
        if (y !== term.lastCursorY) {
          term.lastCursorY = y;
          term.cursorMoveEmitter.fire();
        }
      };
      frame();
    };
  }

  /**
   * Answers a request for the clipboard. Any program in the VM could ask, so
   * it is only answered while this terminal has focus, as it does right after
   * typing a paste command. A refusal answers with nothing, so the command
   * doesn't wait.
   */
  private async pasteToGuest(status: (text: string) => void) {
    let text = "";
    if (
      !document.hasFocus() ||
      !this.element.contains(document.activeElement)
    ) {
      status(
        "Pasting from the clipboard only works while its terminal has focus"
      );
    } else {
      try {
        text = await navigator.clipboard.readText();
      } catch {
        status("The browser didn't allow reading the clipboard");
      }
    }
    let bytes = encoder.encode(text);
    // It's typed in through the emulated serial port, which is slow for more
    if (bytes.length > MAX_PASTE_BYTES) {
      status("The clipboard is too big to paste into the VM (over 1 MB)");
      bytes = new Uint8Array();
    }
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    this.vm.send(this.port, encoder.encode(`\x1b]52;c;${btoa(binary)}\x07`));
  }

  /**
   * OSC 52 copies to the clipboard: ESC ] 52 ; c ; BASE64 BEL. With "?"
   * instead of the text it asks for the clipboard, and the answer is typed
   * back in the same form. The image's wl-copy, xclip, xsel and pbcopy and
   * their paste versions use it, and so can tmux and Neovim. The worker
   * splits it out of the output (see vm-worker.ts).
   */
  private onClipboard(data: string) {
    const base64 = data.slice(data.indexOf(";") + 1);
    if (base64 === "?") {
      void this.pasteToGuest(this.status);
      return;
    }
    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      copyFromGuest(new TextDecoder().decode(bytes), this.status);
    } catch {
      // Not base64; ignored like any unknown sequence
    }
  }

  /**
   * ghostty-web only takes colors when it opens, and warns that changing
   * `options.theme` later isn't supported: its wasm terminal works out each
   * cell's color, and ignores the escape sequences that change them (OSC 4,
   * 10 and 11). So the canvas renderer, which turns those colors into CSS,
   * swaps the first theme's for the current one's, and gets the rest of the
   * theme, like the selection's color. A program's own color that happens to
   * match one of the first theme's changes too.
   */
  setTheme(theme: ITheme) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.colors.clear();
    for (const key of CELL_COLORS) {
      const from = rgbOf(this.firstTheme[key]);
      const to = theme[key];
      if (from !== undefined && to && to !== this.firstTheme[key])
        this.colors.set(from, to);
    }
    const internals = this.term as unknown as GhosttyInternals;
    internals.renderer.setTheme(theme);
    internals.renderer.render(
      internals.wasmTerm,
      true,
      internals.viewportY,
      internals
    );
  }

  /** Refits right away, since the element keeps its size and its observer stays quiet */
  setFontSize(size: number) {
    if (this.term.options.fontSize === size) return;
    this.term.options.fontSize = size;
    this.stale = true;
    if (!this.element.hidden) this.fit.fit();
  }

  get size() {
    return { rows: this.term.rows, cols: this.term.cols };
  }

  /** Type a line into the shell. */
  send(line: string) {
    this.vm.send(this.port, encoder.encode(line + "\r"));
  }

  /** Resolves the next time the shell prints its prompt. */
  waitForPrompt(): Promise<void> {
    return new Promise((resolve) => this.promptWaiters.push(resolve));
  }

  focus() {
    this.term.focus();
  }

  reset() {
    this.tail = "";
    this.phase = "runs";
    this.samples = { runs: [], baseline: [], calibrate: [] };
    this.term.reset();
    this.stale = true;
  }

  private receive(items: SerialItem[]) {
    const parts: Uint8Array[] = [];
    for (const item of items) {
      if (item.kind === "data") parts.push(item.bytes);
      else if (item.kind === "clipboard") this.onClipboard(item.data);
      else {
        const text = this.onMarker(item);
        if (text) parts.push(encoder.encode(text));
      }
    }
    // The worker sends a frame's output at a time, so it renders once
    for (const bytes of parts) {
      this.term.write(bytes);
      this.tail = (
        this.tail + String.fromCharCode(...bytes.subarray(-256))
      ).slice(-256);
    }
    if (PROMPT.test(this.tail.replace(ESCAPES, ""))) {
      const waiters = this.promptWaiters;
      this.promptWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }

  /** Returns text to show in its place */
  private onMarker({
    marker,
    count,
    at,
  }: Extract<SerialItem, { kind: "marker" }>): string | undefined {
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
      this.runStart = { count, at };
    } else if (name === "end") {
      this.samples[this.phase].push({
        instructions: count - this.runStart.count,
        ms: at - this.runStart.at,
      });
    } else if (name === "report") {
      return this.describeRuns();
    }
    return undefined;
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
}
