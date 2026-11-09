---
descriptions: ["zig", "go"]
---

## 2026

<details>
<summary>Show Go Solution</summary>

```go
package main

import (
	"fmt"
	"os"
	"log"
	"bufio"
	"regexp"
	"strings"
	"encoding/json"
)

func main() {
	for i := 0; i < 5; i++ {
		pf := parseFile(fmt.Sprintf("/workspace/days/06/input%d.txt", i))

		text := decodeText(pf)
		fmt.Println(text)
		fmt.Printf("\n\n\n=============================\n\n\n")
	}
}

func decodeText(pf parsedFile) string {
	text := pf.text
	for i := len(pf.mappings)-1; i >= 0; i-- {
		key := pf.mappings[i][0]
		value := pf.mappings[i][1]
		text = strings.ReplaceAll(text, key, value)
	}

	return text
}

type parsedFile struct {
	mappings [][2]string
	text string
}

var re = regexp.MustCompile(`^(?P<key>.) => "(?P<value>.*)"$`)

func parseFile(filename string) parsedFile {
	file, err := os.Open(filename)
	if err != nil {
		log.Fatalf("Failed to open file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	lines := make([]string, 0)
	textLines := ""
	for scanner.Scan() {
		line := scanner.Text()
		// line = strings.TrimSpace(line)
		lines = append(lines, line)
	}

	mappings :=  make([][2]string, 0)
	// parse mappings
	for _, line := range lines {
		match := re.FindStringSubmatch(line)

		if match == nil {
			textLines += line + "\n"
			continue
		}

		// get capture groups
		captures := make(map[string]string)
		for i, name := range re.SubexpNames() {
			// i == 0 is just the whole thing
			if i != 0 && name != "" {
				captures[name] = match[i]
			}
		}
		// clean values from escape characters
		var cleanValue string
		err := json.Unmarshal([]byte(`"`+captures["value"]+`"`), &cleanValue)
		if err != nil {
			log.Fatalf("failed to unmarshal %v: %v", captures["value"], err)
		}

		mappings = append(mappings, [2]string{captures["key"], cleanValue})
	}

	return parsedFile{
		mappings,
		textLines,
	}
}
```

</details>

## 2025

<details>
<summary>Show Zig Solution</summary>

```zig
const std = @import("std");

const allocator = std.heap.page_allocator;
pub fn main() !void {
    var filename_buf: [16]u8 = undefined;
    for (0..5) |i| {
        const filename = try std.fmt.bufPrint(&filename_buf, "./src/input{}.txt", .{i});
        var file = try std.fs.cwd().openFile(filename, .{ .mode = .read_only });
        defer file.close();
        try processFile(&file);
    }
}
fn processFile(file: *std.fs.File) !void {
    var buf: [1024 * 1024]u8 = undefined;
    var reader = file.reader(&buf);

    var subs = std.ArrayList(std.ArrayList(u8)).empty;
    var message = std.ArrayList(u8).empty;
    while (reader.interface.takeDelimiterExclusive('\n')) |line| {
        if (std.mem.indexOf(u8, line, &[_]u8{ '=', '>' })) |ind| {
            const str_start = ind + 4;
            const str_end = line.len - 1;

            var list = std.ArrayList(u8).empty;
            try list.append(allocator, line[0]);
            try list.appendSlice(allocator, line[str_start..str_end]);

            // need to properly replace \n in keys with the actual character for it to work right
            while (std.mem.indexOf(u8, list.items, &[_]u8{ '\\', 'n' })) |index| {
                list.orderedRemoveMany(&[_]usize{ index, index + 1 });
                try list.insert(allocator, index, '\n');
            }

            try subs.append(allocator, list);
        } else {
            try message.appendSlice(allocator, line);
            try message.append(allocator, '\n');
        }
    } else |err| if (err != error.EndOfStream) return err;

    // go through keys in reverse replacing all usages
    var i: usize = subs.items.len;
    while (i > 0) : (i -= 1) {
        const index = i - 1;
        const char = subs.items[index].items[0];
        while (std.mem.indexOfScalar(u8, message.items, char)) |ind| {
            _ = message.orderedRemove(ind);
            try message.insertSlice(allocator, ind, subs.items[index].items[1..]);
        }
    }

    for (message.items) |c| {
        std.debug.print("{c}", .{c});
    }
    std.debug.print("\n\n\n\n======================\n\n\n\n", .{});

    // cleanup
    for (subs.items) |*list| {
        list.deinit(allocator);
    }
    subs.deinit(allocator);
    message.deinit(allocator);
}
```

</details>
