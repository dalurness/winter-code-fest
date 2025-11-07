---
descriptions: ["gleam", "ruby"]
---

## 2025

Ruby again... I'm starting to get familiar with the docs now. I couldn't get debugging in VSCode working, so `irb` was my friend this time.

This goes though character-by-character and keeps track of the previous along with the current. That is enough to keep all the state you need to decode the message. I belive this streams the file reading, and it prints each character as it finds it, so it streams the output too.

```ruby
require 'optparse'

class Day02
  def initialize(filename)
    @filename = filename
  end

  def solve
    mapping = ('a'..'z').chain('A'..'Z').to_a

    prev = nil
    File.open(@filename).each_char do |c|
      if prev.nil?
        if c == '\\'
          prev = c
        else
          $stdout.write c
        end
      elsif prev == '\\'
        if c == '\\'
          $stdout.write c
        else
          prev = c
        end
      else
        symbol = Integer(prev + c, 10)
        raise "Invalid encoding: #{prev + c}" if symbol.negative? || (symbol >= mapping.size)

        $stdout.write mapping[symbol]
        prev = nil
      end
    end.close
  end
end

# Expects the input files to be named 02.txt and 02_challenge.txt and in the current working directory
if __FILE__ == $PROGRAM_NAME
  options = {}
  OptionParser.new do |parser|
    parser.banner = "Usage: #{$PROGRAM_NAME} [options]"

    parser.on('-c', '--challenge', 'Solve with the challenge input') do
      options[:challenge] = true
    end
  end.parse!

  challenge = Day02.new("02#{options[:challenge] ? '_challenge' : ''}.txt")
  challenge.solve
end
```

## 2024

<details>
<summary>Show Gleam Solution</summary>

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

</details>
