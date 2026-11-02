import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker?worker";
import "./highlight";

self.MonacoEnvironment = {
  getWorker: (_id, label) => {
    switch (label) {
      case "typescript":
      case "javascript":
        return new TsWorker();
      case "json":
        return new JsonWorker();
      case "css":
      case "scss":
      case "less":
        return new CssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new HtmlWorker();
      default:
        return new EditorWorker();
    }
  },
};

// The editor has no Node type definitions, so only report syntax errors
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
});

// Light theme in the main site's colors (src/styles/global.css)
monaco.editor.defineTheme("wcf", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "5d7dba", fontStyle: "italic" },
    { token: "keyword", foreground: "3a4fa0" },
    { token: "string", foreground: "a3364a" },
    { token: "number", foreground: "0b7a5c" },
    // Markdown
    { token: "keyword.md", foreground: "3a4fa0", fontStyle: "bold" },
    { token: "strong.md", fontStyle: "bold" },
    { token: "emphasis.md", fontStyle: "italic" },
    { token: "variable.md", foreground: "5d7dba" },
    { token: "string.link.md", foreground: "5d7dba", fontStyle: "underline" },
  ],
  colors: {
    "editor.background": "#f6f9ff",
    "editor.foreground": "#333333",
    "editor.lineHighlightBackground": "#e5f0ff",
    "editor.lineHighlightBorder": "#e5f0ff",
    "editor.selectionBackground": "#b9d1ff",
    "editor.inactiveSelectionBackground": "#d0e3ff",
    "editorCursor.foreground": "#333333",
    "editorLineNumber.foreground": "#99bdff",
    "editorLineNumber.activeForeground": "#5d7dba",
    "editorIndentGuide.background1": "#d0e3ff",
    "editorIndentGuide.activeBackground1": "#99bdff",
    "editorWhitespace.foreground": "#b9d1ff",
    "editorWidget.background": "#e5f0ff",
    "editorStickyScroll.background": "#f6f9ff",
  },
});

// A winter night: near black, tinted blue, with the same accents lightened
monaco.editor.defineTheme("wcf-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6a7d9e", fontStyle: "italic" },
    { token: "keyword", foreground: "8fb3ff" },
    { token: "string", foreground: "e8a0b0" },
    { token: "number", foreground: "7fd4b8" },
    // Markdown
    { token: "keyword.md", foreground: "8fb3ff", fontStyle: "bold" },
    { token: "strong.md", fontStyle: "bold" },
    { token: "emphasis.md", fontStyle: "italic" },
    { token: "variable.md", foreground: "9db8e8" },
    { token: "string.link.md", foreground: "9db8e8", fontStyle: "underline" },
  ],
  colors: {
    "editor.background": "#0d121b",
    "editor.foreground": "#c4cfdf",
    "editor.lineHighlightBackground": "#131b28",
    "editor.lineHighlightBorder": "#131b28",
    "editor.selectionBackground": "#2a4170",
    "editor.inactiveSelectionBackground": "#1e2c44",
    "editorCursor.foreground": "#c4cfdf",
    "editorLineNumber.foreground": "#3a4a66",
    "editorLineNumber.activeForeground": "#8fa6cc",
    "editorIndentGuide.background1": "#1c2636",
    "editorIndentGuide.activeBackground1": "#34476a",
    "editorWhitespace.foreground": "#2a3850",
    "editorWidget.background": "#0f1622",
    "editorWidget.border": "#1c2636",
    "editorStickyScroll.background": "#0d121b",
    "minimap.background": "#0d121b",
    "scrollbarSlider.background": "#4d6ba833",
    "scrollbarSlider.hoverBackground": "#4d6ba855",
  },
});

export const EDITOR_THEMES = { wcf: "wcf", dark: "wcf-dark" } as const;

export { monaco };
