---
descriptions: ["gleam", "elixir", "first time using language"]
---

### 2024 Solution Gleam

```gleam
import gleam/dict
import gleam/int
import gleam/io
import gleam/list
import gleam/string
import simplifile

pub fn main() {
  ["letters.txt", "letters_challenge.txt"]
  |> list.each(find_country_count)
}

fn find_country_count(filename: String) {
  let solution_filename = "solution_" <> filename
  case simplifile.create_file(solution_filename) {
    Ok(_) -> io.println("created file")
    Error(e) -> {
      io.debug(e)
      Nil
    }
  }

  case simplifile.read(filename) {
    Ok(file_contents) -> file_contents
    Error(_) -> {
      io.println("failed to read file: " <> filename)
      panic as "failed to read file"
    }
  }
  |> string.trim()
  |> string.split(" ")
  |> list.fold(dict.new(), fn(acc, country_code) {
    case dict.has_key(acc, country_code) {
      True -> {
        case dict.get(acc, country_code) {
          Error(_) ->
            panic as "how could it not be in there? We just checked..."
          Ok(value) -> {
            dict.insert(acc, country_code, value + 1)
          }
        }
      }
      False -> dict.insert(acc, country_code, 1)
    }
  })
  // collect and output result
  |> dict.each(fn(cc, amount) {
    simplifile.append(
      solution_filename,
      cc <> ": " <> int.to_string(amount) <> "\n",
    )
  })
}
```

### 2023 Solution Elixir

```elixir
writeString = case File.read("../letters.txt") do
  {:ok, body} -> body
  {:error, _reason} -> IO.puts("failed to get file")
end
|> String.split(" ", trim: true)
|> Enum.reduce(Map.new(), fn code, acc -> case Map.has_key?(acc, String.to_integer(code)) do
    false -> Map.put(acc, String.to_integer(code), 1)
    true -> {_old, newMap} = Map.get_and_update!(acc, String.to_integer(code), fn current_value ->
      {current_value, current_value + 1}
    end)
    newMap
  end
end)
|> Enum.sort_by(fn {k,v} -> {v,k} end, :desc)
|> Enum.reduce("", fn {k, v}, acc -> acc <> Integer.to_string(k) <> ": " <> Integer.to_string(v) <> "\n" end)

{:ok, file} = File.open("output.txt", [:write])
IO.binwrite(file, writeString)
```
