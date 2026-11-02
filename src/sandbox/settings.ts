// Editor preferences, remembered per browser.

export type AutoSave = "off" | "afterDelay" | "onFocusChange";
/** "system" follows the browser's light or dark preference */
export type Theme = "system" | "wcf" | "dark";

export interface Settings {
  theme: Theme;
  autoSave: AutoSave;
  renderWhitespace: boolean;
  wordWrap: boolean;
  minimap: boolean;
  /** Show the whole VM filesystem in the explorer, not just /workspace and /tmp */
  showAllFiles: boolean;
  fontSize: number;
  /** Measured runs after the first in a benchmark */
  benchRuns: number;
}

const KEY = "wcf-sandbox-settings";

const prefersDark = matchMedia("(prefers-color-scheme: dark)");

/** The theme to show, with "system" resolved */
export function resolveTheme(theme: Theme): "wcf" | "dark" {
  if (theme !== "system") return theme;
  return prefersDark.matches ? "dark" : "wcf";
}

/** Calls back when the system switches between light and dark */
export function onSystemThemeChange(callback: () => void) {
  prefersDark.addEventListener("change", callback);
}

const DEFAULTS: Settings = {
  theme: "system",
  autoSave: "off",
  renderWhitespace: false,
  wordWrap: false,
  minimap: false,
  showAllFiles: false,
  fontSize: 14,
  benchRuns: 3,
};

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private windows can refuse storage; the settings still apply this visit
  }
}
