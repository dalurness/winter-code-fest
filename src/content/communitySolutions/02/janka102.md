---
descriptions: ["gleam"]
---

# 2024

This uses a state machine to parse the input.

```gleam
import gleam/io
import gleam/int
import gleam/string
import gleam/list
import gleam/result
import gleam/string_builder.{type StringBuilder}

// State machine
// Encapsulates when something is being escaped with a backslash
type Parser {
  Normal(decoded: StringBuilder) // Not escaping
  Escape(decoded: StringBuilder) // Previous char was a backslash
  EscapeChar(decoded: StringBuilder, first: String) // Currently parsing a backslash escape sequence
}

fn try_decode(str: String) {
  use num <- result.try(result.map_error(int.parse(str), fn (_) { "Not a number" }))
  use codepoint_num <- result.try(case num {
    _ if num < 0 || num > 51 -> Error("Invalid escape code")
    n if num > 25 -> Ok(65 + n - 26)
    n -> Ok(97 + n)
  })

  use codepoint <- result.try(result.map_error(string.utf_codepoint(codepoint_num), fn (_) { "Not a codepoint" }))
  Ok(string.from_utf_codepoints([codepoint]))
}

pub fn main() {
  // Copy/paste the contents of the file into the string here
  let input = "..."

  let output = input
  |> string.split("")
  |> list.fold(Normal(string_builder.new()), fn (acc: Parser, c) {
    case c {
      "\\" -> case acc {
        Normal(prev) -> Escape(prev)
        Escape(prev) -> Normal(prev |> string_builder.append(c))
        EscapeChar(_, _) -> panic as "Invalid escape sequence"
      }
      _ -> case acc {
        Normal(prev) -> Normal(prev |> string_builder.append(c))
        Escape(prev) -> EscapeChar(prev, c)
        EscapeChar(prev, first) -> case try_decode(first <> c) {
          Ok(decoded) -> Normal(prev |> string_builder.append(decoded))
          Error(e) -> panic as e
         }
      }
    }
  })

  case output {
    Normal(decoded) -> io.println(decoded |> string_builder.to_string)
    Escape(_) -> panic as "Invalid escape sequence"
    EscapeChar(_, _) -> panic as "Invalid escape sequence"
  }
}
```
