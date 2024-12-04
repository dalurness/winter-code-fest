---
descriptions: ["gleam"]
---

### 2024 Solution Gleam
#### Output
```
17
Adds: 355, Removes: 174
```
```gleam
import gleam/dict
import gleam/int
import gleam/io
import gleam/list
import gleam/option
import gleam/pair
import gleam/string
import simplifile

pub fn main() {
  let increment = fn(x) {
    case x {
      option.Some(i) -> i + 1
      option.None -> 1
    }
  }
  let decrement = fn(x) {
    case x {
      option.Some(i) -> i - 1
      option.None -> 0
    }
  }

  let assembly_codes =
    case simplifile.read("assembly_codes.txt") {
      Ok(file_contents) -> file_contents
      Error(_) -> {
        io.println("failed to read file")
        panic as "failed to read file"
      }
    }
    |> string.split("\n")

  assembly_codes
  |> list.fold(0, fn(good_count, instr_set) {
    let split_set = string.split(instr_set, "C")
    case split_set {
      [a_r, "P"] -> {
        let instr_list = string.split(a_r, "")
        let res =
          list.fold(instr_list, #(True, dict.new()), fn(acc, instr) {
            case instr {
              "A" -> #(True, dict.upsert(pair.second(acc), "A", increment))
              "R" -> {
                case dict.get(pair.second(acc), "A") {
                  Error(_) -> #(False, pair.second(acc))
                  Ok(v) -> {
                    case v == 0 {
                      True -> #(False, pair.second(acc))
                      False -> #(
                        True,
                        dict.upsert(pair.second(acc), "A", decrement),
                      )
                    }
                  }
                }
              }
              _ -> #(False, pair.second(acc))
            }
          })
        case pair.first(res) {
          True -> good_count + 1
          False -> good_count
        }
      }
      _ -> good_count
    }
  })
  |> io.debug

  let counts =
    assembly_codes
    // trim off last two letters
    |> list.map(fn(code: String) { string.drop_end(code, 2) })
    |> list.fold(#(0, 0), fn(acc, c) {
      let code_count =
        string.split(c, "")
        |> list.fold(#(0, 0), fn(acc2, l) {
          case l {
            "A" | "C" -> #(pair.first(acc2) + 1, pair.second(acc2))
            "R" | "P" -> #(pair.first(acc2), pair.second(acc2) + 1)
            _ -> panic as "this shouldn't happen"
          }
        })
      #(
        pair.first(acc) + pair.first(code_count),
        pair.second(acc) + pair.second(code_count),
      )
    })

  io.println(
    "Adds: "
    <> int.to_string(pair.first(counts))
    <> ", Removes: "
    <> int.to_string(pair.second(counts)),
  )
}
```