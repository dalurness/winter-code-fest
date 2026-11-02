import { badge } from "./badges";
import { addContent, DAYS_DIR, fetchContent } from "./content";
import { EDITOR_THEMES, monaco } from "./editor";
import { FileService, type Entry } from "./files";
import { renderMarkdown } from "./preview";
import {
  loadSettings,
  onSystemThemeChange,
  resolveTheme,
  saveSettings,
  type AutoSave,
  type Settings,
} from "./settings";
import { SerialTerminal, TERMINAL_THEMES } from "./terminal";
import { createVm, fetchSnapshot, InstructionCounter } from "./vm";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const ui = {
  run: $<HTMLButtonElement>("run"),
  bench: $<HTMLButtonElement>("bench"),
  reset: $<HTMLButtonElement>("reset"),
  settingsButton: $<HTMLButtonElement>("settings-button"),
  settings: $<HTMLFormElement>("settings"),
  workbench: $("workbench"),
  main: $("main"),
  tree: $("tree"),
  refresh: $<HTMLButtonElement>("refresh"),
  upload: $<HTMLButtonElement>("upload"),
  uploadInput: $<HTMLInputElement>("upload-input"),
  editorArea: document.querySelector<HTMLElement>(".editor-area")!,
  collapse: $<HTMLButtonElement>("collapse"),
  tabs: $("tabs"),
  previewToggle: $<HTMLButtonElement>("preview-toggle"),
  openSite: $<HTMLButtonElement>("open-site"),
  breadcrumbs: $("breadcrumbs"),
  editor: $("editor"),
  preview: $("preview"),
  empty: $("empty"),
  pages: $("pages"),
  split: $<HTMLButtonElement>("split"),
  hidePanel: $<HTMLButtonElement>("hide-panel"),
  status: $("status"),
  cursor: $("cursor"),
  indent: $("indent"),
  language: $("language"),
  autoSave: $<HTMLButtonElement>("autosave-status"),
  quickOpen: $("quick-open"),
  quickOpenInput: $<HTMLInputElement>("quick-open-input"),
  quickOpenResults: $("quick-open-results"),
  contextMenu: $("context-menu"),
};

// --- Metrics -------------------------------------------------------------
// Network bytes for VM assets (0 when served from the HTTP cache). Exposed as
// window.sandboxMetrics so measurements can be collected from the console.

const metrics = {
  bytes: 0,
  timeToPromptMs: 0,
  bytesToPrompt: 0,
  snapshot: false,
  runs: [] as {
    file: string;
    ms: number;
    bytes: number;
    instructions: number[];
  }[],
};
(window as unknown as { sandboxMetrics: typeof metrics }).sandboxMetrics =
  metrics;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
    if (entry.name.includes("/v86/") || entry.name.includes("/day/"))
      metrics.bytes += entry.transferSize;
  }
}).observe({ type: "resource", buffered: true });

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
const setStatus = (text: string) => (ui.status.textContent = text);

const settings = loadSettings();

// --- VM and terminals ----------------------------------------------------

const params = new URLSearchParams(location.search);
const started = performance.now();
setStatus("Downloading snapshot…");
const contentPromise = fetchContent();
const snapshot = params.has("fresh") ? undefined : await fetchSnapshot();
metrics.snapshot = !!snapshot;
setStatus(
  snapshot
    ? "Restoring snapshot…"
    : "Booting (no snapshot, this takes a while)…"
);

const vm = createVm(snapshot);
// Handy for poking at the emulator from devtools while developing
if (import.meta.env.DEV) Object.assign(window, { vm });
const files = new FileService(vm);
const counter = new InstructionCounter(vm);
const terms = [
  new SerialTerminal(vm, 0, $("term0"), counter),
  new SerialTerminal(vm, 1, $("term1"), counter),
] as const;
let activeTerm: SerialTerminal = terms[0];
terms.forEach((t) =>
  t.element.addEventListener("focusin", () => (activeTerm = t))
);

/** `sb` sets the guest clock (for cargo mtimes) and the terminal size. */
function sbArgs(term: SerialTerminal) {
  const { rows, cols } = term.size;
  return `${Math.floor(Date.now() / 1000)} ${rows} ${cols}`;
}

/** Wait for a shell prompt on the terminal, then sync clock and size. */
async function attachShell(term: SerialTerminal) {
  // Hidden until the setup command below has run and cleared the screen
  term.element.style.visibility = "hidden";
  try {
    const prompt = term.waitForPrompt();
    // A restored snapshot is already sitting at a prompt; Enter reprints it
    if (snapshot) term.send("");
    await prompt;
    const synced = term.waitForPrompt();
    term.send(`sb sync ${sbArgs(term)}; cd /workspace && clear`);
    await synced;
  } finally {
    term.element.style.visibility = "";
  }
}

/** Quotes a path for the guest shell. */
const shellQuote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

// --- Settings ------------------------------------------------------------

const editor = monaco.editor.create(ui.editor, {
  automaticLayout: true,
  stickyScroll: { enabled: true },
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: "active" },
});

const AUTO_SAVE_LABELS: Record<AutoSave, string> = {
  off: "Auto Save: Off",
  afterDelay: "Auto Save: After Delay",
  onFocusChange: "Auto Save: On Focus Change",
};

function applySettings() {
  const theme = resolveTheme(settings.theme);
  document.documentElement.dataset["theme"] = theme;
  monaco.editor.setTheme(EDITOR_THEMES[theme]);
  terms.forEach((t) => t.setTheme(TERMINAL_THEMES[theme]));
  editor.updateOptions({
    renderWhitespace: settings.renderWhitespace ? "all" : "selection",
    wordWrap: settings.wordWrap ? "on" : "off",
    minimap: { enabled: settings.minimap },
    fontSize: settings.fontSize,
  });
  ui.autoSave.textContent = AUTO_SAVE_LABELS[settings.autoSave];
  ui.autoSave.hidden = false;

  const form = ui.settings.elements;
  for (const name of ["theme", "autoSave", "fontSize", "benchRuns"] as const) {
    (form.namedItem(name) as HTMLInputElement).value = String(settings[name]);
  }
  for (const name of [
    "renderWhitespace",
    "wordWrap",
    "minimap",
    "showAllFiles",
  ] as const) {
    (form.namedItem(name) as HTMLInputElement).checked = settings[name];
  }
}

function updateSettings(changes: Partial<Settings>) {
  const showAllFiles = settings.showAllFiles;
  Object.assign(settings, changes);
  saveSettings(settings);
  applySettings();
  if (settings.showAllFiles !== showAllFiles) renderTree();
}

ui.settings.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  if (input instanceof HTMLInputElement && input.type === "checkbox") {
    updateSettings({ [input.name]: input.checked });
  } else if (input.name === "fontSize") {
    const size = Number(input.value);
    if (size >= 8 && size <= 32) updateSettings({ fontSize: size });
  } else if (input.name === "benchRuns") {
    const runs = Number(input.value);
    if (Number.isInteger(runs) && runs >= 1 && runs <= 20)
      updateSettings({ benchRuns: runs });
  } else {
    updateSettings({ [input.name]: input.value });
  }
});
ui.settings.addEventListener("submit", (event) => event.preventDefault());

ui.settingsButton.onclick = () => openSettings();

const AUTO_SAVE_ORDER: AutoSave[] = ["off", "afterDelay", "onFocusChange"];
ui.autoSave.onclick = () => {
  const next = (AUTO_SAVE_ORDER.indexOf(settings.autoSave) + 1) % 3;
  updateSettings({ autoSave: AUTO_SAVE_ORDER[next]! });
};

applySettings();
onSystemThemeChange(applySettings);

// --- Open files and tabs -------------------------------------------------

interface OpenFile {
  model: monaco.editor.ITextModel;
  savedVersion: number;
  /** Markdown shown rendered instead of as source */
  preview: boolean;
  viewState: monaco.editor.ICodeEditorViewState | null;
  autoSaveTimer?: ReturnType<typeof setTimeout>;
}

/**
 * A page of the site, such as a day's question, in a tab that works like a
 * small browser limited to the site. It keeps its own history, so its
 * navigation never lands in the real browser's back button.
 */
interface OpenPage {
  frame: HTMLIFrameElement;
  url: string;
  title: string;
  history: string[];
  index: number;
}

/** The settings form, in a tab like VS Code's */
interface OpenSettings {
  settings: true;
}

type Tab = OpenFile | OpenPage | OpenSettings;

/**
 * Open tabs in order. Files are keyed by their VM path, pages by "page:" and
 * the URL they opened at, and settings by SETTINGS.
 */
const open = new Map<string, Tab>();
let active: string | undefined;
const SETTINGS = "settings";

const isPage = (tab: Tab): tab is OpenPage => "frame" in tab;
const isFile = (tab: Tab): tab is OpenFile => "model" in tab;
const fileAt = (key: string | undefined) => {
  const tab = key ? open.get(key) : undefined;
  return tab && isFile(tab) ? tab : undefined;
};
const isDirty = (tab: Tab) =>
  isFile(tab) && tab.model.getAlternativeVersionId() !== tab.savedVersion;
const isMarkdown = (tab: Tab): tab is OpenFile =>
  isFile(tab) && ["markdown", "mdx"].includes(tab.model.getLanguageId());
const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const dirName = (path: string) => path.slice(0, path.lastIndexOf("/")) || "/";

/** Files bigger than this are not opened; Monaco struggles and 9p has to fetch them whole. */
const MAX_OPEN_BYTES = 5e6;

async function loadFile(path: string): Promise<OpenFile | undefined> {
  const size = files.size(path);
  if (size > MAX_OPEN_BYTES) {
    setStatus(`${baseName(path)} is ${mb(size)}, too big to open`);
    return;
  }
  const bytes = await files.readBytes(path);
  if (bytes.subarray(0, 8000).includes(0)) {
    setStatus(`${baseName(path)} is a binary file (${mb(bytes.length)})`);
    return;
  }
  const model = monaco.editor.createModel(
    new TextDecoder().decode(bytes),
    // Monaco picks the language from the file name
    undefined,
    monaco.Uri.file(path)
  );
  const file: OpenFile = {
    model,
    savedVersion: model.getAlternativeVersionId(),
    // Markdown opens rendered, like a question on the site
    preview: ["markdown", "mdx"].includes(model.getLanguageId()),
    viewState: null,
  };
  model.onDidChangeContent(() => {
    renderTabs();
    markDirtyInTree(path);
    if (settings.autoSave === "afterDelay") {
      clearTimeout(file.autoSaveTimer);
      file.autoSaveTimer = setTimeout(() => save(path), 1000);
    }
  });
  return file;
}

async function openFile(path: string, { focus = true } = {}) {
  if (!open.has(path)) {
    const file = await loadFile(path);
    if (!file) return;
    open.set(path, file);
  }
  activate(path, { focus });
}

const SITE = import.meta.env.BASE_URL;

/** Page tabs show the site, but not other sites or the sandbox itself */
const isSitePage = (url: URL) =>
  url.origin === location.origin &&
  url.pathname.startsWith(SITE) &&
  !url.pathname.startsWith(`${SITE}sandbox/`);

let pageTabs = 0;

/** The part of the Navigation API used here; TypeScript's DOM types lack it */
interface NavigateEvent extends Event {
  readonly destination: { readonly url: string };
}
type WithNavigation = Window & {
  navigation?: EventTarget & {
    addEventListener(
      type: "navigate",
      listener: (event: NavigateEvent) => void
    ): void;
  };
};

/**
 * Opens a page of the site in a tab, or the tab it already has unless
 * `newTab`. Links inside it navigate within the tab, except links to input
 * files, which open the VM's copy, and links to the sandbox, which open what
 * they point to here.
 */
function openPage(url: string, { newTab = false } = {}) {
  const key = newTab ? `page:${url}#${++pageTabs}` : `page:${url}`;
  if (!open.has(key)) {
    const frame = document.createElement("iframe");
    frame.className = "page-frame";
    // Everything but navigating the sandbox's own browser tab away. New tabs
    // the page opens are ordinary ones.
    frame.sandbox.add(
      "allow-same-origin",
      "allow-scripts",
      "allow-forms",
      "allow-popups",
      "allow-popups-to-escape-sandbox",
      "allow-modals",
      "allow-downloads"
    );
    frame.src = url;
    frame.hidden = true;
    const page: OpenPage = {
      frame,
      url,
      title: "Loading…",
      history: [url],
      index: 0,
    };
    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      const where = doc && new URL(frame.contentWindow!.location.href);
      // Somewhere the checks below missed, like another site in a browser
      // without the Navigation API. Its address is not readable from here.
      if (!where || !isSitePage(where)) {
        frame.contentWindow?.location.replace(page.history[page.index]!);
        setStatus("Page tabs only show Winter Code Fest pages");
        return;
      }
      // Other sites open in a browser tab, whatever started the navigation:
      // link clicks are handled in onPageClick, this catches scripts and forms
      (frame.contentWindow as WithNavigation).navigation?.addEventListener(
        "navigate",
        (event) => {
          const to = new URL(event.destination.url);
          if (to.origin === location.origin || !event.cancelable) return;
          event.preventDefault();
          window.open(to.href, "_blank", "noopener");
        }
      );
      // The site's "Open in the sandbox" buttons, while already in it
      const style = doc.createElement("style");
      style.textContent = `a[href^="${SITE}sandbox/"] { display: none !important; }`;
      doc.head.append(style);
      page.url = where.pathname + where.search + where.hash;
      page.history[page.index] = page.url;
      page.title = doc.title;
      doc.addEventListener("click", (event) => onPageClick(event, page));
      // The editor's shortcuts work while the page has focus too
      doc.addEventListener("keydown", onShortcutKey, { capture: true });
      doc.addEventListener("dragover", onEditorDragOver);
      doc.addEventListener("drop", onEditorDrop);
      renderTabs();
      if (active === key) renderBreadcrumbs();
    });
    ui.pages.append(frame);
    open.set(key, page);
  }
  activate(key);
}

/**
 * Go to a URL in a page tab, or that many steps back or forward in its
 * history. False if it is not somewhere a page tab goes.
 */
function navigatePage(page: OpenPage, to: URL | number): boolean {
  if (typeof to === "number") {
    const index = page.index + to;
    if (index < 0 || index >= page.history.length) return false;
    page.index = index;
  } else {
    if (!isSitePage(to)) {
      setStatus("Page tabs only open Winter Code Fest pages");
      return false;
    }
    page.history.splice(page.index + 1, Infinity, to.href);
    page.index = page.history.length - 1;
  }
  page.frame.contentWindow?.location.replace(page.history[page.index]!);
  return true;
}

function onPageClick(event: MouseEvent, page: OpenPage) {
  const link = (event.target as Element).closest("a");
  if (!link || event.defaultPrevented) return;
  const url = new URL(link.href, page.frame.contentWindow!.location.href);
  if (url.origin !== location.origin) {
    link.target = "_blank";
    link.rel = "noopener";
    return;
  }
  event.preventDefault();
  if (url.pathname.startsWith(`${SITE}sandbox/`)) {
    void openFromParams(url.searchParams);
    return;
  }
  // An input file, like day/01/letters.txt
  const input = url.pathname
    .slice(SITE.length)
    .match(/^day\/(\d+)\/([^/]+\.[^/]+)$/);
  const path = input && `${DAYS_DIR}/${input[1]}/${input[2]}`;
  if (path && files.exists(path)) void openFile(path);
  else if (event.ctrlKey || event.metaKey || event.button === 1)
    openPage(url.pathname + url.search + url.hash, { newTab: true });
  else navigatePage(page, url);
}

ui.openSite.onclick = () => openPage(SITE, { newTab: true });

function openSettings() {
  if (!open.has(SETTINGS)) open.set(SETTINGS, { settings: true });
  activate(SETTINGS);
}

/**
 * ?day=7 opens that day's page, and ?day=7&solution=name that person's
 * solution page and code next to it, for the site's pages to link to.
 */
async function openFromParams(params: URLSearchParams): Promise<boolean> {
  const day = params.get("day")?.padStart(2, "0");
  if (!day || !files.exists(`${DAYS_DIR}/${day}`)) return false;
  const solution = params.get("solution");
  if (!solution) {
    openPage(`${SITE}day/${day}/`);
    return true;
  }
  openPage(`${SITE}day/${day}/solution/${solution}/`);
  const dir = `${DAYS_DIR}/${day}/solutions/${solution}`;
  const code = files.exists(dir)
    ? files.list(dir).find((e) => e.name.startsWith("solution"))
    : undefined;
  if (code) await openFile(code.path);
  return true;
}

function activate(path: string | undefined, { focus = true } = {}) {
  const previous = fileAt(active);
  if (previous) {
    previous.viewState = editor.saveViewState();
    if (settings.autoSave === "onFocusChange" && active !== path)
      void save(active!);
  }

  active = path;
  const file = fileAt(path);
  editor.setModel(file?.model ?? null);
  if (file?.viewState) editor.restoreViewState(file.viewState);
  for (const [key, tab] of open) {
    if (isPage(tab)) tab.frame.hidden = key !== path;
  }
  ui.settings.hidden = path !== SETTINGS;

  if (file) reveal(path!);
  renderTabs();
  renderBreadcrumbs();
  updatePreview({ focus });
  updateStatusBar();
  updateRunButton();
  renderTree();
}

function closeFiles(paths: string[]) {
  const dirty = paths.filter((p) => isDirty(open.get(p)!));
  if (
    dirty.length &&
    !confirm(
      `${dirty.map(baseName).join(", ")} ${dirty.length === 1 ? "has" : "have"} unsaved changes. Close anyway?`
    )
  )
    return;

  const order = [...open.keys()];
  for (const path of paths) {
    const tab = open.get(path)!;
    open.delete(path);
    if (isPage(tab)) {
      tab.frame.remove();
    } else if (isFile(tab)) {
      clearTimeout(tab.autoSaveTimer);
      tab.model.dispose();
    }
  }
  if (active && !open.has(active)) {
    // Like VS Code, the tab to the right takes over, else the one to the left
    const index = order.indexOf(active);
    const next =
      order.slice(index + 1).find((p) => open.has(p)) ??
      order
        .slice(0, index)
        .reverse()
        .find((p) => open.has(p));
    active = undefined;
    activate(next);
  } else {
    renderTabs();
  }
}

/** Moves a tab next to another one, keeping the rest in order */
function moveTab(key: string, target: string, after: boolean) {
  if (key === target) return;
  const entries = [...open].filter(([k]) => k !== key);
  const index = entries.findIndex(([k]) => k === target) + (after ? 1 : 0);
  entries.splice(index, 0, [key, open.get(key)!]);
  open.clear();
  for (const [k, tab] of entries) open.set(k, tab);
  renderTabs();
}

let draggedTab: string | undefined;

/** Which half of a tab the pointer is over: dropping there goes after it */
const isAfter = (event: DragEvent, tab: HTMLElement) => {
  const { left, width } = tab.getBoundingClientRect();
  return event.clientX > left + width / 2;
};

function renderTabs() {
  // Show the parent folder on tabs that share a name, like VS Code
  const counts = new Map<string, number>();
  for (const [path, file] of open) {
    if (!isFile(file)) continue;
    const name = baseName(path);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  ui.tabs.replaceChildren(
    ...[...open].map(([path, file]) => {
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.role = "tab";
      tab.title = isPage(file) ? file.url : isFile(file) ? path : "Settings";
      tab.classList.toggle("active", path === active);
      tab.classList.toggle("dirty", isDirty(file));
      tab.setAttribute("aria-selected", String(path === active));

      const name = document.createElement("span");
      name.textContent = isPage(file)
        ? file.title
        : !isFile(file)
          ? "Settings"
          : isMarkdown(file) && file.preview
            ? `Preview ${baseName(path)}`
            : baseName(path);
      tab.append(
        badge(
          isPage(file)
            ? "page.html"
            : isFile(file)
              ? baseName(path)
              : "Settings"
        ),
        name
      );
      if (isFile(file) && (counts.get(baseName(path)) ?? 0) > 1) {
        const description = document.createElement("span");
        description.className = "description";
        description.textContent = baseName(dirName(path));
        tab.append(description);
      }

      const close = document.createElement("button");
      close.className = "close";
      close.title = "Close (Alt+W)";
      close.onclick = (event) => {
        event.stopPropagation();
        closeFiles([path]);
      };
      tab.append(close);

      tab.onclick = () => activate(path);
      // Middle click closes, like VS Code
      tab.onauxclick = (event) => event.button === 1 && closeFiles([path]);
      tab.oncontextmenu = (event) => {
        event.preventDefault();
        showTabMenu(path, event);
      };

      // Drag to reorder, like VS Code
      tab.draggable = true;
      tab.ondragstart = (event) => {
        draggedTab = path;
        event.dataTransfer!.effectAllowed = "move";
        tab.classList.add("dragging");
      };
      tab.ondragend = () => {
        draggedTab = undefined;
        renderTabs();
      };
      tab.ondragover = (event) => {
        if (!draggedTab) return;
        event.preventDefault();
        const after = isAfter(event, tab);
        tab.classList.toggle("drop-before", !after);
        tab.classList.toggle("drop-after", after);
      };
      tab.ondragleave = () => tab.classList.remove("drop-before", "drop-after");
      tab.ondrop = (event) => {
        event.preventDefault();
        if (draggedTab) moveTab(draggedTab, path, isAfter(event, tab));
      };
      return tab;
    })
  );
  ui.tabs.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  ui.empty.hidden = open.size > 0;
}

/** Back, forward, reload and the address, in place of a page tab's breadcrumbs */
function renderAddressBar(page: OpenPage) {
  const button = (text: string, title: string, onclick: () => void) => {
    const b = document.createElement("button");
    b.className = "icon";
    b.textContent = text;
    b.title = title;
    b.onclick = onclick;
    return b;
  };
  const back = button("←", "Back", () => navigatePage(page, -1));
  back.disabled = page.index === 0;
  const forward = button("→", "Forward", () => navigatePage(page, 1));
  forward.disabled = page.index === page.history.length - 1;
  const reload = button("⟳", "Reload", () =>
    page.frame.contentWindow?.location.reload()
  );

  const address = document.createElement("input");
  address.type = "text";
  address.value = page.url;
  address.spellcheck = false;
  address.setAttribute("aria-label", "Address");
  address.onfocus = () => address.select();
  address.onkeydown = (event) => {
    if (event.key === "Escape") address.value = page.url;
    if (event.key !== "Enter") return;
    // Relative addresses, like "day/03", are within the site
    const url = new URL(address.value.trim(), location.origin + SITE);
    if (navigatePage(page, url)) page.frame.focus();
    else address.value = page.url;
  };

  ui.breadcrumbs.classList.add("address-bar");
  ui.breadcrumbs.append(back, forward, reload, address);
}

function renderBreadcrumbs() {
  ui.breadcrumbs.replaceChildren();
  ui.breadcrumbs.classList.remove("address-bar");
  const tab = active && open.get(active);
  if (!tab) return;
  if (isPage(tab)) return renderAddressBar(tab);
  (isFile(tab) ? active! : "Settings")
    .split("/")
    .filter(Boolean)
    .forEach((part, i) => {
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "›";
        ui.breadcrumbs.append(sep);
      }
      ui.breadcrumbs.append(part);
    });
}

function updateStatusBar() {
  const model = editor.getModel();
  ui.cursor.hidden = ui.indent.hidden = ui.language.hidden = !model;
  if (!model) return;
  const { lineNumber, column } = editor.getPosition() ?? {
    lineNumber: 1,
    column: 1,
  };
  ui.cursor.textContent = `Ln ${lineNumber}, Col ${column}`;
  const { insertSpaces, tabSize } = model.getOptions();
  ui.indent.textContent = `${insertSpaces ? "Spaces" : "Tab Size"}: ${tabSize}`;
  const id = model.getLanguageId();
  ui.language.textContent =
    monaco.languages.getLanguages().find((l) => l.id === id)?.aliases?.[0] ??
    id;
}
editor.onDidChangeCursorPosition(updateStatusBar);

async function save(path: string) {
  const file = fileAt(path);
  if (!file || !isDirty(file)) return;
  clearTimeout(file.autoSaveTimer);
  const version = file.model.getAlternativeVersionId();
  await files.write(path, file.model.getValue());
  file.savedVersion = version;
  renderTabs();
  markDirtyInTree(path);
}

async function saveAll() {
  await Promise.all([...open.keys()].map(save));
}

editor.onDidBlurEditorWidget(() => {
  if (settings.autoSave === "onFocusChange" && active) void save(active);
});
window.addEventListener("blur", () => {
  if (settings.autoSave === "onFocusChange") void saveAll();
});

/** Pick up changes made inside the VM (new files, files edited in the terminal). */
async function refresh() {
  for (const [path, file] of open) {
    if (!isFile(file) || isDirty(file) || !files.exists(path)) continue;
    const text = await files.read(path);
    if (text !== file.model.getValue()) {
      file.model.setValue(text);
      file.savedVersion = file.model.getAlternativeVersionId();
    }
  }
  renderTabs();
  renderTree();
  if (!ui.preview.hidden) updatePreview({ focus: false });
}

// --- Markdown preview ----------------------------------------------------

function updatePreview({ focus = true } = {}) {
  const file = fileAt(active);
  const markdown = !!file && isMarkdown(file);
  const show = markdown && file.preview;
  ui.previewToggle.disabled = !markdown;
  ui.previewToggle.classList.toggle("on", show);
  ui.preview.hidden = !show;
  ui.editor.hidden = !file || show;
  if (show) {
    renderMarkdown(ui.preview, file.model.getValue(), active!, (path) => {
      const target = files.resolveFile(path);
      if (target) void openFile(target);
      else setStatus(`${path} not found`);
    });
  } else if (file && focus) {
    editor.focus();
  }
}

function togglePreview(path = active) {
  const file = fileAt(path);
  if (!file || !isMarkdown(file)) return;
  file.preview = !file.preview;
  if (path === active) updatePreview();
  renderTabs();
}
ui.previewToggle.onclick = () => togglePreview();

// --- Tab context menu ----------------------------------------------------

type MenuItem = [label: string, action: () => void] | "separator";

function showMenu(items: MenuItem[], event: MouseEvent) {
  ui.contextMenu.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      if (item === "separator") {
        li.role = "separator";
        return li;
      }
      const [label, action] = item;
      li.role = "menuitem";
      li.tabIndex = -1;
      li.textContent = label;
      li.onclick = () => {
        hideMenu();
        action();
      };
      return li;
    })
  );
  ui.contextMenu.hidden = false;
  // Keep the menu on screen
  const { width, height } = ui.contextMenu.getBoundingClientRect();
  ui.contextMenu.style.left = `${Math.min(event.clientX, innerWidth - width - 4)}px`;
  ui.contextMenu.style.top = `${Math.min(event.clientY, innerHeight - height - 4)}px`;
}

const hideMenu = () => (ui.contextMenu.hidden = true);

function showTabMenu(path: string, event: MouseEvent) {
  const file = open.get(path)!;
  const paths = [...open.keys()];
  const items: MenuItem[] = [];
  if (isPage(file)) {
    items.push(
      ["Reload", () => file.frame.contentWindow?.location.reload()],
      ["Open in New Window", () => window.open(file.url, "_blank")],
      "separator"
    );
  }
  if (isMarkdown(file)) {
    items.push(
      [
        file.preview ? "Show Source" : "Open Preview",
        () => togglePreview(path),
      ],
      "separator"
    );
  }
  items.push(
    ["Close", () => closeFiles([path])],
    ["Close Others", () => closeFiles(paths.filter((p) => p !== path))],
    [
      "Close to the Right",
      () => closeFiles(paths.slice(paths.indexOf(path) + 1)),
    ],
    [
      "Close Saved",
      () => closeFiles(paths.filter((p) => !isDirty(open.get(p)!))),
    ],
    ["Close All", () => closeFiles(paths)]
  );
  if (isFile(file)) {
    items.push(
      "separator",
      ["Copy Path", () => void navigator.clipboard.writeText(path)],
      [
        "Reveal in Explorer",
        () => {
          showSidebar(true);
          reveal(path);
          renderTree();
        },
      ]
    );
  }
  showMenu(items, event);
}

document.addEventListener("pointerdown", (event) => {
  const target = event.target as Element;
  if (!target.closest(".context-menu")) hideMenu();
  if (!target.closest(".quick-open")) hideQuickOpen();
});

// --- Explorer ------------------------------------------------------------

// Roots in the explorer. Directories are read when expanded, since the image
// has tens of thousands of files.
function sections() {
  return settings.showAllFiles
    ? [{ label: "Filesystem", path: "/" }]
    : [
        { label: "Workspace", path: "/workspace" },
        { label: "tmp", path: "/tmp" },
      ];
}

// "/" is the Filesystem root, shown instead of the others with showAllFiles
let expanded = new Set(["/", "/workspace"]);
const fileRows = new Map<string, HTMLElement[]>();

function markDirtyInTree(path: string) {
  const file = fileAt(path);
  for (const row of fileRows.get(path) ?? []) {
    row.classList.toggle("dirty", !!file && isDirty(file));
  }
}

/** Expand the folders above a file so it shows in the tree. */
function reveal(path: string) {
  const root =
    sections().find((s) => s.path !== "/" && path.startsWith(`${s.path}/`))
      ?.path ?? "/";
  expanded.add(root);
  for (
    let i = path.indexOf("/", root.length + 1);
    i > 0;
    i = path.indexOf("/", i + 1)
  ) {
    expanded.add(path.slice(0, i));
  }
}

function row(entry: Entry, depth: number, isOpen?: boolean): HTMLElement {
  const row = document.createElement("div");
  row.className = "row";
  row.tabIndex = -1;
  row.role = "treeitem";
  row.style.paddingLeft = `${4 + depth * 8}px`;
  row.title =
    entry.kind === "link" ? `${entry.path} → ${entry.target}` : entry.path;
  row.dataset["path"] = entry.path;

  const twistie = document.createElement("span");
  twistie.className = "twistie";
  twistie.textContent = isOpen === undefined ? "" : isOpen ? "⌄" : "›";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = entry.name;
  row.append(twistie);
  if (entry.kind !== "dir") row.append(badge(entry.name));
  row.append(name);

  if (entry.kind === "dir") {
    row.setAttribute("aria-expanded", String(isOpen));
    row.dataset["dir"] = entry.path;
    row.onclick = () => {
      uploadDir = entry.path;
      if (!expanded.delete(entry.path)) expanded.add(entry.path);
      renderTree();
    };
  } else {
    if (entry.kind === "link") {
      row.classList.add("link");
      const target = document.createElement("span");
      target.className = "target";
      target.textContent = `→ ${entry.target}`;
      row.append(target);
    }
    const path = files.resolveFile(entry.path) ?? entry.path;
    row.classList.toggle("active", path === active);
    fileRows.set(path, [...(fileRows.get(path) ?? []), row]);
    markDirtyInTree(path);
    row.onclick = () => {
      uploadDir = dirName(entry.path);
      void openFile(path);
    };
  }
  return row;
}

function renderDir(dir: string, depth: number): HTMLElement {
  const ul = document.createElement("ul");
  ul.role = "group";
  // Indent guide under the parent folder's twistie
  ul.style.setProperty("--guide", `${4 + (depth - 1) * 8 + 8}px`);
  for (const entry of files.list(dir)) {
    const li = document.createElement("li");
    const isOpen = entry.kind === "dir" ? expanded.has(entry.path) : undefined;
    li.append(row(entry, depth, isOpen));
    if (isOpen) li.append(renderDir(entry.path, depth + 1));
    ul.append(li);
  }
  return ul;
}

function renderTree() {
  fileRows.clear();
  const focused = (document.activeElement as HTMLElement | null)?.title;
  const ul = document.createElement("ul");
  ul.role = "tree";
  for (const { label, path } of sections()) {
    const li = document.createElement("li");
    li.className = "section-root";
    const isOpen = expanded.has(path);
    li.append(row({ name: label, path, kind: "dir" }, 0, isOpen));
    if (isOpen) li.append(renderDir(path, 1));
    ul.append(li);
  }

  const scroll = ui.tree.scrollTop;
  ui.tree.replaceChildren(ul);
  ui.tree.scrollTop = scroll;
  ui.tree.querySelector(".row.active")?.scrollIntoView({ block: "nearest" });
  // Keep keyboard focus on the same row after re-rendering
  if (focused) {
    const rows = [...ui.tree.querySelectorAll<HTMLElement>(".row")];
    rows.find((r) => r.title === focused)?.focus();
  }
}

/** Arrow keys move between rows, Left and Right fold folders, like VS Code */
ui.tree.addEventListener("keydown", (event) => {
  const rows = [...ui.tree.querySelectorAll<HTMLElement>(".row")];
  const current = document.activeElement as HTMLElement;
  const index = rows.indexOf(current);
  if (index === -1) return;
  const dir = current.dataset["dir"];
  const move = (i: number) =>
    rows[Math.max(0, Math.min(rows.length - 1, i))]?.focus();
  switch (event.key) {
    case "ArrowDown":
      move(index + 1);
      break;
    case "ArrowUp":
      move(index - 1);
      break;
    case "ArrowRight":
      if (dir && !expanded.has(dir)) current.click();
      else move(index + 1);
      break;
    case "ArrowLeft":
      if (dir && expanded.has(dir)) current.click();
      break;
    case "Enter":
    case " ":
      current.click();
      break;
    default:
      return;
  }
  event.preventDefault();
});

function focusExplorer() {
  showSidebar(true);
  const row =
    ui.tree.querySelector<HTMLElement>(".row.active") ??
    ui.tree.querySelector<HTMLElement>(".row");
  row?.focus();
}

ui.collapse.onclick = () => {
  expanded = new Set(["/", "/workspace"]);
  renderTree();
};

// --- Upload and drop files -----------------------------------------------

/** Where the upload button puts files: the folder last clicked in the explorer */
let uploadDir = "/workspace";
/** Bigger files would sit in browser memory twice until `sb` copies them in */
const MAX_UPLOAD_BYTES = 50e6;

interface Upload {
  /** Relative to the folder it goes in, with subfolders for dropped folders */
  path: string;
  file: File;
}

/** The files in a drop, including everything inside dropped folders */
async function droppedFiles(transfer: DataTransfer): Promise<Upload[]> {
  const result: Upload[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string) => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      );
      result.push({ path: prefix + entry.name, file });
    } else {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns them in batches, then an empty one
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject)
        );
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  // Entries must all be taken before the first await, while the drop is live
  const entries = [...transfer.items]
    .map((item) => item.webkitGetAsEntry())
    .filter((entry) => entry !== null);
  // Without entries (some browsers, scripted drops) there are just the files
  if (!entries.length)
    return [...transfer.files].map((file) => ({ path: file.name, file }));
  for (const entry of entries) await walk(entry, "");
  return result;
}

/** Writes files into a folder of the VM. Returns the paths written. */
async function upload(uploads: Upload[], dir: string): Promise<string[]> {
  if (!ready) {
    setStatus("Wait for the VM to start before adding files");
    return [];
  }
  const tooBig = uploads.filter((u) => u.file.size > MAX_UPLOAD_BYTES);
  if (tooBig.length) {
    setStatus(
      `Skipped ${tooBig.map((u) => u.file.name).join(", ")}: over ${mb(MAX_UPLOAD_BYTES)}`
    );
    uploads = uploads.filter((u) => !tooBig.includes(u));
  }
  const prefix = dir === "/" ? "" : dir;
  const targets = uploads.map((u) => ({ ...u, path: `${prefix}/${u.path}` }));
  const existing = targets.filter((t) => files.exists(t.path));
  if (
    existing.length &&
    !confirm(
      `Replace ${existing.map((t) => baseName(t.path)).join(", ")} in ${dir}?`
    )
  )
    return [];

  for (const { path, file } of targets) {
    await files.write(path, new Uint8Array(await file.arrayBuffer()));
  }
  if (targets[0]) reveal(targets[0].path);
  // Reloads open tabs of replaced files and redraws the tree
  await refresh();
  if (targets.length) {
    setStatus(
      `Added ${targets.length === 1 ? baseName(targets[0]!.path) : `${targets.length} files`} to ${dir}`
    );
  }
  return targets.map((t) => t.path);
}

ui.upload.onclick = () => ui.uploadInput.click();
ui.uploadInput.onchange = async () => {
  const picked = [...(ui.uploadInput.files ?? [])];
  ui.uploadInput.value = "";
  await upload(
    picked.map((file) => ({ path: file.name, file })),
    uploadDir
  );
};

const isFileDrag = (event: DragEvent) =>
  !!event.dataTransfer?.types.includes("Files");

/** The folder a drop on the explorer goes in: a folder row's, or a file row's folder */
function treeDropDir(event: DragEvent): string {
  const row = (event.target as Element).closest<HTMLElement>(".row");
  if (!row) return uploadDir;
  return row.dataset["dir"] ?? dirName(row.dataset["path"]!);
}

function clearDropTargets() {
  for (const el of document.querySelectorAll(".drop-target"))
    el.classList.remove("drop-target");
}

ui.tree.addEventListener("dragover", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
  const dir = treeDropDir(event);
  clearDropTargets();
  ui.tree.classList.add("drop-target");
  ui.tree
    .querySelector(`.row[data-dir="${CSS.escape(dir)}"]`)
    ?.classList.add("drop-target");
});
ui.tree.addEventListener("drop", async (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  clearDropTargets();
  const dir = treeDropDir(event);
  await upload(await droppedFiles(event.dataTransfer!), dir);
});

// Dropped on the editor: into the open file's folder, then opened. Page tabs
// pass their drag events here too, since the iframe gets them.
function onEditorDragOver(event: DragEvent) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
  ui.editorArea.classList.add("drop-target");
}

async function onEditorDrop(event: DragEvent) {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  clearDropTargets();
  const dir = fileAt(active) ? dirName(active!) : uploadDir;
  const paths = await upload(await droppedFiles(event.dataTransfer!), dir);
  // Opening dozens of tabs from a dropped folder is not useful
  for (const path of paths.slice(0, 10)) await openFile(path);
}

ui.editorArea.addEventListener("dragover", onEditorDragOver);
ui.editorArea.addEventListener("drop", onEditorDrop);

// Anywhere else, keep the browser from opening the file in place of the page
window.addEventListener("dragover", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer!.dropEffect = "none";
});
window.addEventListener("dragleave", (event) => {
  // Left the window, or moved between elements: dragover marks targets again
  if (!event.relatedTarget || !ui.tree.contains(event.relatedTarget as Node))
    ui.tree.classList.remove("drop-target");
  if (!ui.editorArea.contains(event.relatedTarget as Node | null))
    ui.editorArea.classList.remove("drop-target");
  if (!event.relatedTarget) clearDropTargets();
});
window.addEventListener("drop", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  clearDropTargets();
});

// --- Quick open (Ctrl+P) -------------------------------------------------

let quickOpenFiles: string[] = [];
let quickOpenSelected = 0;

/** Every file under the explorer's roots, skipping build caches. */
function listAllFiles(): string[] {
  const SKIP = /^(node_modules|target|build|\.zig-cache|_build|\.git)$/;
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of files.list(dir)) {
      if (result.length > 20000) return;
      if (entry.kind === "dir") {
        if (!SKIP.test(entry.name)) walk(entry.path);
      } else {
        result.push(entry.path);
      }
    }
  };
  for (const { path } of sections()) {
    if (path !== "/") walk(path);
  }
  return result;
}

/** Lower is better, or undefined if `query`'s letters are not all in order in `path`. */
function fuzzyScore(path: string, query: string): number | undefined {
  const name = baseName(path).toLowerCase();
  if (name.startsWith(query)) return 0;
  if (name.includes(query)) return 1;
  let i = 0;
  const lower = path.toLowerCase();
  for (const c of query) {
    i = lower.indexOf(c, i) + 1;
    if (i === 0) return undefined;
  }
  return 2 + path.length / 1000;
}

function renderQuickOpen() {
  const query = ui.quickOpenInput.value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "");
  const results = query
    ? quickOpenFiles
        .map((path) => [path, fuzzyScore(path, query)] as const)
        .filter(([, score]) => score !== undefined)
        .sort((a, b) => a[1]! - b[1]!)
        .slice(0, 50)
        .map(([path]) => path)
    : [...open.keys()].filter((key) => fileAt(key)).reverse();
  quickOpenSelected = Math.min(
    quickOpenSelected,
    Math.max(results.length - 1, 0)
  );

  ui.quickOpenResults.replaceChildren(
    ...results.map((path, i) => {
      const li = document.createElement("li");
      li.role = "option";
      li.dataset["path"] = path;
      li.classList.toggle("selected", i === quickOpenSelected);
      const dir = document.createElement("span");
      dir.className = "dir";
      dir.textContent = dirName(path);
      li.append(badge(baseName(path)), baseName(path), dir);
      li.onclick = () => {
        hideQuickOpen();
        void openFile(path);
      };
      return li;
    })
  );
  ui.quickOpenResults
    .querySelector(".selected")
    ?.scrollIntoView({ block: "nearest" });
}

function showQuickOpen() {
  quickOpenFiles = listAllFiles();
  quickOpenSelected = 0;
  ui.quickOpenInput.value = "";
  ui.quickOpen.hidden = false;
  renderQuickOpen();
  ui.quickOpenInput.focus();
}

function hideQuickOpen() {
  if (ui.quickOpen.hidden) return;
  ui.quickOpen.hidden = true;
  if (active && ui.preview.hidden) editor.focus();
}

ui.quickOpenInput.oninput = () => {
  quickOpenSelected = 0;
  renderQuickOpen();
};
ui.quickOpenInput.onkeydown = (event) => {
  const count = ui.quickOpenResults.children.length;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    quickOpenSelected = (quickOpenSelected + step + count) % Math.max(count, 1);
    renderQuickOpen();
  } else if (event.key === "Enter") {
    const path = (
      ui.quickOpenResults.children[quickOpenSelected] as HTMLElement | undefined
    )?.dataset["path"];
    hideQuickOpen();
    if (path) void openFile(path);
  }
};

// --- Layout: sidebar, terminal panel and their sizes ---------------------

const root = document.documentElement.style;

function showSidebar(show = ui.workbench.classList.contains("sidebar-hidden")) {
  ui.workbench.classList.toggle("sidebar-hidden", !show);
}

function showPanel(show = ui.main.classList.contains("panel-hidden")) {
  ui.main.classList.toggle("panel-hidden", !show);
  if (show) activeTerm.focus();
  else if (active && ui.preview.hidden) editor.focus();
}

function resizePanel(by: number) {
  const main = ui.main.getBoundingClientRect();
  const panel = ui.main.querySelector(".panel")!.getBoundingClientRect();
  const height = Math.min(Math.max(panel.height + by, 80), main.height - 120);
  root.setProperty("--panel-height", `${height}px`);
}

function sash(element: HTMLElement, onMove: (event: PointerEvent) => void) {
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    element.classList.add("dragging");
    const up = () => {
      element.classList.remove("dragging");
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", up);
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", up);
  });
}

sash($("sash-sidebar"), (event) => {
  const width = Math.min(Math.max(event.clientX, 140), innerWidth * 0.6);
  root.setProperty("--sidebar-width", `${width}px`);
});
sash($("sash-panel"), (event) => {
  const main = ui.main.getBoundingClientRect();
  const height = Math.min(
    Math.max(main.bottom - event.clientY, 80),
    main.height - 120
  );
  root.setProperty("--panel-height", `${height}px`);
});

// --- Run -----------------------------------------------------------------

/** Files `sb run` knows how to run, besides anything in a starter project */
const RUNNABLE =
  /\.(ts|js|mjs|rb|py|go|rs|c|s|S|zig|exs|ex|sh|gleam|clk|cpp|cc|cxx|erl|lua|php|pl)$/;
const STARTER = /^\/workspace\/(?!days\/)[^/]+\//;
let running = false;
/** Set once the first shell prompt is up */
let ready = false;

const canRun = (path: string | undefined): path is string =>
  !!path && (RUNNABLE.test(path) || STARTER.test(path));

function updateRunButton() {
  ui.run.disabled = ui.bench.disabled = running || !ready || !canRun(active);
  ui.run.title = canRun(active)
    ? `Save all and run ${baseName(active)} (Ctrl+Enter)`
    : "Open a source file to run it";
  ui.bench.title = canRun(active)
    ? `Run ${baseName(active)} ${settings.benchRuns} more times without output and count the VM's instructions (Ctrl+Shift+Enter)`
    : "Open a source file to benchmark it";
}

/**
 * Runs the open file. Every run counts the instructions the VM ran for the
 * program, not its build. That count is about the same in any browser, where
 * the time is not. A benchmark runs it a few more times, to warm caches and
 * show the spread.
 */
async function run({ bench = false } = {}) {
  const path = active;
  if (running || !ready || !canRun(path)) return;
  running = true;
  updateRunButton();
  showPanel(true);
  const term = activeTerm;
  try {
    await saveAll();
    const bytesBefore = metrics.bytes;
    const t0 = performance.now();
    const done = term.waitForPrompt();
    term.send(
      bench
        ? `sb bench ${sbArgs(term)} ${shellQuote(path)} ${settings.benchRuns}`
        : // The first run measures background work, for the count
          `${counter.busyRate === undefined ? "SB_CALIBRATE=1 " : ""}sb run ${sbArgs(term)} ${shellQuote(path)}`
    );
    await done;
    // Resource timing entries can land a moment after the response finishes
    await new Promise((r) => setTimeout(r, 100));
    const result = {
      file: path,
      ms: Math.round(performance.now() - t0),
      bytes: metrics.bytes - bytesBefore,
      instructions: term.counts,
    };
    metrics.runs.push(result);
    setStatus(
      bench
        ? `${baseName(path)}: ${term.describeRuns().slice(2) || "failed"}`
        : `${baseName(path)}: ran in ${(result.ms / 1000).toFixed(1)}s${term.describeRuns()}, fetched ${mb(result.bytes)}`
    );
    await refresh();
  } finally {
    running = false;
    updateRunButton();
  }
}

// --- Other actions -------------------------------------------------------

async function reset() {
  if (!snapshot) return location.reload();
  if (!confirm("Restore the VM snapshot? Unsaved and saved edits are lost."))
    return;
  setStatus("Restoring snapshot…");
  // Pages stay open; files reopen below with the snapshot's contents
  const reopen = [...open.keys()].filter((key) => fileAt(key));
  const current = active;
  for (const key of reopen) {
    const file = fileAt(key)!;
    clearTimeout(file.autoSaveTimer);
    file.model.dispose();
    open.delete(key);
  }
  activate(undefined);
  await vm.restore_state(snapshot);
  counter.resync();
  addContent(files, await contentPromise);
  terms.forEach((t) => t.reset());
  await Promise.all(
    terms.filter((t) => !t.element.hidden).map((t) => attachShell(t))
  );
  for (const path of reopen) {
    if (files.exists(path)) await openFile(path, { focus: false });
  }
  if (current && open.has(current)) activate(current);
  setStatus("Reset to snapshot");
}

async function openSecondTerminal() {
  if (!ready || !terms[1].element.hidden) return;
  ui.split.disabled = true;
  showPanel(true);
  const term = terms[1];
  term.element.hidden = false;
  await attachShell(term);
  term.focus();
}

ui.run.onclick = () => run();
ui.bench.onclick = () => run({ bench: true });
ui.refresh.onclick = refresh;
ui.reset.onclick = reset;
ui.split.onclick = openSecondTerminal;
ui.hidePanel.onclick = () => showPanel(false);

// --- Keyboard shortcuts --------------------------------------------------

/** Tab by offset from the active one, wrapping around */
function cycleTab(step: number) {
  const paths = [...open.keys()];
  if (!paths.length) return;
  const index = active ? paths.indexOf(active) : 0;
  activate(paths[(index + step + paths.length) % paths.length]);
}

/**
 * VS Code's shortcuts, where the browser lets a page have them (it keeps
 * Ctrl+W, Ctrl+Tab and Ctrl+PageUp/PageDown). Handled in the capture phase so
 * they work from the editor and the terminals too, as in VS Code.
 */
function shortcut(event: KeyboardEvent): (() => unknown) | undefined {
  const ctrl = event.ctrlKey || event.metaKey;
  const { shiftKey: shift, altKey: alt, code } = event;
  if (event.key === "Escape") {
    if (!ui.quickOpen.hidden) return hideQuickOpen;
    if (!ui.contextMenu.hidden) return hideMenu;
    return;
  }
  if (event.key === "F5") return () => run();
  if (ctrl && !alt) {
    if (code === "Enter") return () => run({ bench: shift });
    if (code === "KeyS" && !shift) return () => active && save(active);
    if (code === "KeyP" && !shift) return showQuickOpen;
    if ((code === "Backquote" || code === "KeyJ") && !shift)
      return () => showPanel();
    if (code === "Backquote" && shift) return openSecondTerminal;
    if (code === "ArrowUp" && shift) return () => resizePanel(40);
    if (code === "ArrowDown" && shift) return () => resizePanel(-40);
    if (code === "KeyB" && !shift) return () => showSidebar();
    if (code === "KeyE" && shift) return focusExplorer;
    if (code === "KeyV" && shift) return () => togglePreview();
    if (code === "Comma") return openSettings;
    if (code === "F4") return () => active && closeFiles([active]);
  }
  if (alt && !ctrl && !shift) {
    if (code === "KeyW") return () => active && closeFiles([active]);
    const digit = /^Digit([1-9])$/.exec(code)?.[1];
    if (digit) {
      return () => {
        const paths = [...open.keys()];
        // Alt+9 is the last tab, like VS Code
        activate(
          digit === "9" ? paths.at(-1) : (paths[Number(digit) - 1] ?? active)
        );
      };
    }
    if (code === "ArrowRight") return () => cycleTab(1);
    if (code === "ArrowLeft") return () => cycleTab(-1);
  }
  return;
}

function onShortcutKey(event: KeyboardEvent) {
  const action = shortcut(event);
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  void action();
}
window.addEventListener("keydown", onShortcutKey, { capture: true });
window.addEventListener("focus", () => !running && refresh());
window.addEventListener("beforeunload", (event) => {
  if ([...open.values()].some(isDirty)) event.preventDefault();
});

// --- Start ---------------------------------------------------------------

vm.add_listener("download-progress", (e) => {
  if (e.lengthComputable && e.total > 1e6) {
    setStatus(
      `Downloading ${e.file_name.split("/").pop()}: ${mb(e.loaded)} / ${mb(e.total)}`
    );
  }
});

renderTabs();
updatePreview({ focus: false });
updateRunButton();

// emulator-ready fires before the snapshot is restored, emulator-loaded after
await new Promise<void>((resolve) =>
  vm.add_listener("emulator-loaded", () => resolve())
);
counter.resync();
// Before the shell starts, so the days exist before anything looks them up
addContent(files, await contentPromise);
await attachShell(terms[0]);
ready = true;

metrics.timeToPromptMs = Math.round(performance.now() - started);
metrics.bytesToPrompt = metrics.bytes;
setStatus(
  `Ready in ${(metrics.timeToPromptMs / 1000).toFixed(1)}s, ${mb(metrics.bytesToPrompt)} downloaded`
);

if (!(await openFromParams(params))) await openFile("/workspace/README.md");
// Until now it stood in for the editor while the VM started
ui.empty.textContent =
  "Open a file from the explorer, or press Ctrl+P to find one.";

for (const el of [ui.refresh, ui.reset, ui.split, ui.upload])
  el.disabled = false;
updateRunButton();
