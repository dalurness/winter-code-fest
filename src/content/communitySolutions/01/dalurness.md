---
descriptions: ["zig", "gleam", "elixir", "first time using language"]
---

### 2025 Solution Zig

```zig
const std = @import("std");

pub fn main() !void {
    const allocator = std.heap.page_allocator;

    const file = try std.fs.cwd().openFile("letters_challenge.txt", .{ .mode = .read_only });
    defer file.close();

    const buffer_size = 4096;
    var buffer: [buffer_size]u8 = undefined;

    var map = std.AutoHashMap(usize, usize).init(allocator);
    defer map.deinit();

    var start_chunk: usize = 0;
    while (true) {
        const bytes_read = try file.read(buffer[start_chunk..]);

        // only break if there is nothing else to read AND there are no more carry-over vals left in the buffer
        if ((bytes_read == 0) and (start_chunk == 0)) break;

        var chunk: []u8 = buffer[0..(bytes_read + start_chunk)];
        var token_start: usize = 0;
        for (chunk, 0..) |c, i| {
            // need to catch if these are the leftover vals
            if (c == ' ' or (i == (chunk.len - 1) and bytes_read == 0)) {
                var full_token = chunk[token_start..i];
                if (token_start == i) {
                    full_token = chunk;
                }
                const key = try std.fmt.parseInt(usize, full_token, 10);

                const value_ptr = map.getPtr(key);
                if (value_ptr) |value| {
                    value.* += 1;
                } else {
                    try map.put(key, 1);
                }
                token_start = i + 1;
            }

            // check if this is the last iteration
            if (i == (chunk.len - 1)) {
                // copy all leftover items to the beginning of chunk
                start_chunk = chunk.len - token_start;

                var j: usize = 0;
                while (token_start < chunk.len) {
                    chunk[j] = chunk[token_start];
                    token_start = token_start + 1;
                    j = j + 1;
                }
            }
        }
    }

    var mapit = map.iterator();
    while (mapit.next()) |entry| {
        std.debug.print("{}: {}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
    }
}

```

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
