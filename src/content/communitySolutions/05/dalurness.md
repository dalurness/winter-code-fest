---
descriptions: ["zig"]
---

### 2025 Solution Zig

```zig
const std = @import("std");

pub fn main() !void {
    var filename_buf: [11]u8 = undefined;
    var buffer: [10]u8 = undefined;
    for (0..6) |i| {
        const filename = try std.fmt.bufPrint(&filename_buf, "./src/{}.txt", .{i});
        var file = try std.fs.cwd().openFile(filename, .{ .mode = .read_only });
        defer file.close();

        // parse the file and process
        const out_filename = try std.fmt.bufPrint(&filename_buf, "./src/{}.out", .{i});
        var write_file = try std.fs.cwd().createFile(
            out_filename,
            .{},
        );
        defer write_file.close();
        try processFile(&write_file, &file, buffer[0..]);
    }
}

const Loc = packed struct {
    x: usize,
    y: usize,
};

fn writeLoc(l: *usize, max: *usize, v: usize) void {
    l.* = v;
    if (l.* > max.*) {
        max.* = l.*;
    }
}

fn processFile(write_file: *std.fs.File, file: *std.fs.File, filebuf: []u8) !void {
    const allocator = std.heap.page_allocator;
    var x: usize = 0;
    var y: usize = 0;
    var max_x: usize = 0;
    var max_y: usize = 0;

    var reader = file.reader(filebuf);
    var map = std.AutoHashMap(Loc, u8).init(allocator);
    defer map.deinit();
    while (reader.interface.takeDelimiterExclusive('\n')) |line| {
        switch (line[0]) {
            'D' => {
                const num = try std.fmt.parseInt(usize, line[1..], 10);
                writeLoc(&x, &max_x, x + num);
            },
            'U' => {
                const num = try std.fmt.parseInt(usize, line[1..], 10);
                writeLoc(&x, &max_x, x - num);
            },
            'R' => {
                const num = try std.fmt.parseInt(usize, line[1..], 10);
                writeLoc(&y, &max_y, y + num);
            },
            'L' => {
                switch (line[1]) {
                    'R' => {
                        x = 0;
                        y = 0;
                    },
                    else => {
                        const num = try std.fmt.parseInt(usize, line[1..], 10);
                        writeLoc(&y, &max_y, y - num);
                    },
                }
            },
            'P' => {
                try map.put(Loc{ .x = x, .y = y }, line[1]);
            },
            else => {
                std.debug.print("invalid code: {c}", .{line[0]});
                return error.InvalidCode;
            },
        }
    } else |err| if (err != error.EndOfStream) return err;

    // print out result to file
    for (0..max_x) |x_val| {
        for (0..max_y) |y_val| {
            if (map.get(Loc{ .x = x_val, .y = y_val })) |v| {
                _ = try write_file.write(&[_]u8{v});
            } else {
                _ = try write_file.write(&[_]u8{' '});
            }
        }
        _ = try write_file.write(&[_]u8{'\n'});
    }
}
```
