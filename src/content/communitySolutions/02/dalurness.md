---
descriptions: ["gleam"]
---

### 2024 Solution Gleam

```gleam
import gleam/int
import gleam/io
import gleam/list
import gleam/string
import simplifile

pub fn main() {
  ["small_message_encoded.txt", "large_message_encoded.txt"]
  |> list.each(decode_file)
}

fn decode_file(filename: String) {
  let solution_filename = "solution_" <> filename
  case simplifile.create_file(solution_filename) {
    Ok(_) -> io.println("created file")
    Error(e) -> {
      io.debug(e)
      Nil
    }
  }

  let #(_, added_backslash) =
    case simplifile.read(filename) {
      Ok(file_contents) -> file_contents
      Error(_) -> {
        io.println("failed to read file: " <> filename)
        panic as "failed to read file"
      }
    }
    |> string.split("\\")
    |> list.map(fn(group: String) {
      case string.split(group, "") {
        [first, second, ..rest] ->
          num_to_str(first, second) <> string.join(rest, "")
        [s] -> s
        [] -> ""
      }
    })
    // this isn't my favorite solution, but in order to handle the backslashes
    // this piece goes through the list and looks for two consecutive items that
    // are empty strings. This is created from splitting on the backslash, so if there
    // are two in a row, we know that it was actually an escaped backslash.
    |> list.map_fold(False, fn(has_first, item) {
      case item {
        "" -> {
          case has_first {
            True -> #(False, "\\")
            False -> #(True, "")
          }
        }
        other -> {
          #(False, other)
        }
      }
    })

  simplifile.write(solution_filename, string.join(added_backslash, ""))
}

fn num_to_str(first: String, second: String) {
  let num = case int.parse(first <> second) {
    Error(_) -> panic as "failed to parse"
    Ok(n) -> n
  }
  let converted_number = case num {
    n if n > 25 -> n + 39
    n -> n + 97
  }
  let cp = case string.utf_codepoint(converted_number) {
    Error(_) -> panic as "faled to convert to codepoint"
    Ok(cp) -> cp
  }

  string.from_utf_codepoints([cp])
}

```
