// Monarch grammars for languages Monaco does not ship: Zig, Gleam, Erlang,
// Clank, TOML, Makefile and GNU assembler. Highlighting only, no language features.
import * as monaco from "monaco-editor";
import {
  CONSTANTS as clankConstants,
  KEYWORDS as clankKeywords,
  RULES as clankRules,
} from "../highlight/clank";

type Grammar = monaco.languages.IMonarchLanguage;

const zig: Grammar = {
  // prettier-ignore
  keywords: [
    "addrspace", "align", "allowzero", "and", "anyframe", "anytype", "asm",
    "break", "callconv", "catch", "comptime", "const", "continue", "defer",
    "else", "enum", "errdefer", "error", "export", "extern", "fn", "for", "if",
    "inline", "linksection", "noalias", "noinline", "nosuspend", "opaque", "or",
    "orelse", "packed", "pub", "resume", "return", "struct", "suspend",
    "switch", "test", "threadlocal", "try", "union", "unreachable",
    "usingnamespace", "var", "volatile", "while",
  ],
  // prettier-ignore
  typeKeywords: [
    "isize", "usize", "c_char", "c_short", "c_ushort", "c_int", "c_uint",
    "c_long", "c_ulong", "c_longlong", "c_ulonglong", "c_longdouble", "f16",
    "f32", "f64", "f80", "f128", "bool", "anyopaque", "void", "noreturn",
    "type", "anyerror", "comptime_int", "comptime_float",
  ],
  constants: ["true", "false", "null", "undefined"],
  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/\\\\.*$/, "string"],
      [/@[a-zA-Z_]\w*/, "annotation"],
      [/\b[iu]\d+\b/, "type"],
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@constants": "constant",
            "@default": "identifier",
          },
        },
      ],
      [/0x[\da-fA-F_]+/, "number.hex"],
      [/0o[0-7_]+/, "number.octal"],
      [/0b[01_]+/, "number.binary"],
      [/\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?/, "number"],
      [/"/, "string", "@string"],
      [/'(\\.|[^\\'])+'/, "string"],
      [/[{}()[\]]/, "@brackets"],
      [/[=<>!~?:&|+\-*/^%.]+/, "operator"],
    ],
    string: [
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
      [/[^\\"]+/, "string"],
    ],
  },
};

const gleam: Grammar = {
  // prettier-ignore
  keywords: [
    "as", "assert", "auto", "case", "const", "delegate", "derive", "echo",
    "else", "fn", "if", "implement", "import", "let", "macro", "opaque",
    "panic", "pub", "test", "todo", "type", "use",
  ],
  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/@[a-z_]\w*/, "annotation"],
      [/[A-Z]\w*/, "type.identifier"],
      [
        /[a-z_]\w*/,
        { cases: { "@keywords": "keyword", "@default": "identifier" } },
      ],
      [/0x[\da-fA-F_]+/, "number.hex"],
      [/0o[0-7_]+/, "number.octal"],
      [/0b[01_]+/, "number.binary"],
      [/\d[\d_]*(\.[\d_]*)?([eE]-?\d+)?/, "number"],
      [/"/, "string", "@string"],
      [/[{}()[\]]/, "@brackets"],
      [/\|>|->|<-|<>|\.\.|[=<>!+\-*/%.&|]+\.?/, "operator"],
    ],
    string: [
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
      [/[^\\"]+/, "string"],
    ],
  },
};

const erlang: Grammar = {
  // prettier-ignore
  keywords: [
    "after", "and", "andalso", "band", "begin", "bnot", "bor", "bsl", "bsr",
    "bxor", "case", "catch", "cond", "div", "else", "end", "fun", "if", "let",
    "maybe", "not", "of", "or", "orelse", "receive", "rem", "try", "when",
    "xor",
  ],
  tokenizer: {
    root: [
      [/%.*$/, "comment"],
      // Attributes like -module(name).
      [/^-[a-z_]\w*/, "annotation"],
      [/[A-Z_]\w*/, "variable"],
      [
        /[a-z]\w*/,
        { cases: { "@keywords": "keyword", "@default": "identifier" } },
      ],
      [/'(\\.|[^\\'])*'/, "identifier"],
      [/\?\??[A-Za-z_]\w*/, "constant"],
      [/\$\\?./, "number"],
      [/\d+#[\da-zA-Z]+/, "number"],
      [/\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
      [/"/, "string", "@string"],
      [/[{}()[\]]/, "@brackets"],
      [/->|<-|<=|=>|::|\|\||[=<>!+\-*/|:.]+/, "operator"],
    ],
    string: [
      [/~[\d.*]*[a-zA-Z~]/, "string.escape"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
      [/[^\\"~]+|~/, "string"],
    ],
  },
};

// Built from the same rules as the site's TextMate grammar
const clank: Grammar = {
  keywords: clankKeywords,
  constants: clankConstants,
  tokenizer: {
    root: [
      [clankRules.comment, "comment"],
      [clankRules.type, "type.identifier"],
      [
        clankRules.identifier,
        {
          cases: {
            "@keywords": "keyword",
            "@constants": "constant",
            "@default": "identifier",
          },
        },
      ],
      [clankRules.effectRow, "annotation"],
      [clankRules.number, "number"],
      [clankRules.quote, "string", "@string"],
      [clankRules.bracket, "@brackets"],
      [clankRules.operator, "operator"],
    ],
    string: [
      [clankRules.interpolationStart, "delimiter.bracket", "@interpolation"],
      [clankRules.escape, "string.escape"],
      [clankRules.quote, "string", "@pop"],
      [/[^\\"$]+|\$/, "string"],
    ],
    interpolation: [
      [clankRules.interpolationEnd, "delimiter.bracket", "@pop"],
      { include: "root" },
    ],
  },
};

const toml: Grammar = {
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/^\s*\[\[[^\]]*\]\]/, "type"],
      [/^\s*\[[^\]]*\]/, "type"],
      [/[A-Za-z0-9_-]+(?=\s*(\.|=))/, "key"],
      [/"""/, "string", "@mlBasic"],
      [/'''/, "string", "@mlLiteral"],
      [/"/, "string", "@basic"],
      [/'[^']*'/, "string"],
      [/\b(true|false)\b/, "keyword"],
      [
        /\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?(Z|[+-]\d{2}:\d{2})?/,
        "number",
      ],
      [/[+-]?(0x[\da-fA-F_]+|0o[0-7_]+|0b[01_]+|inf|nan)/, "number"],
      [/[+-]?\d[\d_]*(\.[\d_]+)?([eE][+-]?\d+)?/, "number"],
      [/[=,.[\]{}]/, "delimiter"],
    ],
    basic: [
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
      [/[^\\"]+/, "string"],
    ],
    mlBasic: [
      [/\\./, "string.escape"],
      [/"""/, "string", "@pop"],
      [/./, "string"],
    ],
    mlLiteral: [
      [/'''/, "string", "@pop"],
      [/./, "string"],
    ],
  },
};

const makefile: Grammar = {
  // prettier-ignore
  directives: [
    "include", "-include", "sinclude", "ifeq", "ifneq", "ifdef", "ifndef",
    "else", "endif", "define", "endef", "export", "unexport", "override",
    "vpath", "undefine", "private",
  ],
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/^[\w.-]+(?=\s*[:+?!]?=)/, "variable"],
      [/^[^\s:=#][^:=#]*(?=::?(?!=))/, "type"],
      [
        /^\s*(-?[a-z]+)\b/,
        { cases: { "$1@directives": "keyword", "@default": "" } },
      ],
      { include: "@variables" },
      [/"([^"\\]|\\.)*"|'[^']*'/, "string"],
      [/[:+?!]?=|::?/, "operator"],
    ],
    variables: [
      [/\$[@<^?*+%|]/, "variable.predefined"],
      [/\$[({][^)}]*[)}]/, "variable"],
      [/\$\w/, "variable"],
    ],
  },
};

// GNU as, in both AT&T (the default) and Intel syntax
const asm: Grammar = {
  tokenizer: {
    root: [
      [/(#|\/\/).*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/^\s*[\w.$]+:/, "type"],
      [/\.[a-zA-Z_]\w*/, "keyword"],
      [/%[a-z]\w*/, "variable.predefined"],
      [/\$-?(0x[\da-fA-F]+|\d+|'.')/, "number"],
      [/\$[\w.]+/, "variable"],
      [/^\s*[a-z]\w*/, "keyword.instruction"],
      [/-?(0x[\da-fA-F]+|0b[01]+|\d+)\b/, "number"],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'(\\.|[^\\'])'/, "string"],
      [/[(),]/, "delimiter"],
    ],
    comment: [
      [/\*\//, "comment", "@pop"],
      [/./, "comment"],
    ],
  },
};

const languages: [monaco.languages.ILanguageExtensionPoint, Grammar][] = [
  [{ id: "zig", extensions: [".zig", ".zon"] }, zig],
  [{ id: "gleam", extensions: [".gleam"] }, gleam],
  [{ id: "erlang", extensions: [".erl", ".hrl", ".escript"] }, erlang],
  [{ id: "clank", extensions: [".clk"] }, clank],
  [{ id: "toml", extensions: [".toml"], filenames: ["Cargo.lock"] }, toml],
  [
    {
      id: "makefile",
      extensions: [".mk"],
      filenames: ["Makefile", "makefile", "GNUmakefile"],
    },
    makefile,
  ],
  [{ id: "asm", extensions: [".s", ".S", ".asm"] }, asm],
];

for (const [language, grammar] of languages) {
  monaco.languages.register(language);
  monaco.languages.setMonarchTokensProvider(language.id, grammar);
}

const comments: Record<string, monaco.languages.CommentRule> = {
  zig: { lineComment: "//" },
  gleam: { lineComment: "//" },
  erlang: { lineComment: "%" },
  clank: { lineComment: "#" },
  toml: { lineComment: "#" },
  makefile: { lineComment: "#" },
  asm: { lineComment: "#", blockComment: ["/*", "*/"] },
};
for (const [id, rule] of Object.entries(comments)) {
  monaco.languages.setLanguageConfiguration(id, {
    comments: rule,
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });
}
