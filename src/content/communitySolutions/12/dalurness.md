---
descriptions: ["zig"]
---

## 2025

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
