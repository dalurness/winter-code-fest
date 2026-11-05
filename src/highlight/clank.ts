// Clank (https://github.com/dalurness/clank), after its SPEC.md. The
// sandbox's Monarch grammar (src/sandbox/highlight.ts) and the site's
// TextMate grammar for Shiki below are both built from these rules, so the
// two match token for token. Identifiers may contain dashes (flat-map), as in
// Clank itself, so minus needs spaces.

// prettier-ignore
export const KEYWORDS = [
  "let", "in", "fn", "if", "then", "else", "match", "do", "type", "effect",
  "affine", "handle", "resume", "perform", "mod", "use", "pub", "clone",
  "interface", "impl", "deriving", "where", "opaque", "return", "test",
  "alias", "discard", "for", "fold",
];
export const CONSTANTS = ["true", "false"];

/**
 * In the order both grammars try them. Shiki reads these with Oniguruma,
 * where an unescaped [ inside a character class starts a nested class, so
 * write it as \[.
 */
export const RULES = {
  comment: /#.*$/,
  type: /[A-Z][\w]*/,
  identifier: /[a-z_][\w-]*/,
  // Effect rows: <>, <io>, <exn[E], async>
  effectRow: /<>|<[a-z][\w\[\], ]*>/,
  number: /\d+(\.\d+)?([eE][+-]?\d+)?/,
  quote: /"/,
  bracket: /[{}()\[\]]/,
  operator: /\|>|->|=>|\+\+|\.\.|[=<>!+\-*/%&|:]+/,
  // Inside strings
  interpolationStart: /\$\{/,
  interpolationEnd: /\}/,
  escape: /\\(u\{[\da-fA-F]+\}|x[\da-fA-F]{2}|.)/,
};

/** Matches one of `words` only where the identifier rule would match all of it */
function word(words: string[]) {
  return `(?<![\\w-])(?:${words.join("|")})(?![\\w-])`;
}

/** TextMate grammar, in the shape of Shiki's LanguageRegistration */
export const textMate = {
  name: "clank",
  displayName: "Clank",
  scopeName: "source.clank",
  fileTypes: ["clk"],
  patterns: [{ include: "#code" }],
  repository: {
    code: {
      patterns: [
        { match: RULES.comment.source, name: "comment.line.number-sign.clank" },
        { match: RULES.type.source, name: "entity.name.type.clank" },
        { match: word(KEYWORDS), name: "keyword.control.clank" },
        { match: word(CONSTANTS), name: "constant.language.clank" },
        // Named so they aren't string-colored inside ${}, and matched so
        // words like x1 aren't read as numbers
        { match: RULES.identifier.source, name: "variable.other.clank" },
        { match: RULES.effectRow.source, name: "support.type.effect.clank" },
        { match: RULES.number.source, name: "constant.numeric.clank" },
        { include: "#string" },
        { match: RULES.operator.source, name: "keyword.operator.clank" },
      ],
    },
    string: {
      name: "string.quoted.double.clank",
      begin: RULES.quote.source,
      end: RULES.quote.source,
      patterns: [
        {
          name: "meta.embedded.clank",
          begin: RULES.interpolationStart.source,
          end: RULES.interpolationEnd.source,
          beginCaptures: {
            0: { name: "punctuation.section.embedded.begin.clank" },
          },
          endCaptures: {
            0: { name: "punctuation.section.embedded.end.clank" },
          },
          patterns: [{ include: "#code" }],
        },
        { match: RULES.escape.source, name: "constant.character.escape.clank" },
      ],
    },
  },
};
