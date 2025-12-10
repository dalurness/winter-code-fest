---
descriptions: ["zig"]
---

## 2025

#### Output

```
41
```

```zig
const std = @import("std");

const SEPARATOR = ',';
pub fn main() !void {
    const allocator = std.heap.page_allocator;
    var str = std.ArrayList(u8).empty;
    defer str.deinit(allocator);
    for (1..1_000_001) |i| {
        const digits = try digitsOfInt(@as(u256, i), allocator);
        for (digits) |d| {
            if (d == '8') {
                try str.append(allocator, SEPARATOR);
            } else {
                try str.append(allocator, d);
            }
        }
        if (i % 6 == 0) {
            try str.append(allocator, SEPARATOR);
        }
    }

    var sum: u256 = 0;
    var next_num = std.ArrayList(u8).empty;
    defer next_num.deinit(allocator);
    for (str.items) |c| {
        if (c == ',') {
            if (next_num.items.len > 0) {
                const num = try std.fmt.parseInt(u256, next_num.items, 10);
                sum += num;
                next_num.clearRetainingCapacity();
            }
        } else {
            try next_num.append(allocator, c);
        }
    }

    const digits = try digitsOfInt(sum, allocator);

    std.debug.print("{}", .{digits.len});
    std.debug.print("\n", .{});
}

fn digitsOfInt(num: u256, allocator: std.mem.Allocator) ![]u8 {
    var n = num;

    // Special case for 0
    if (n == 0) {
        const buf = try allocator.alloc(u8, 1);
        buf[0] = 0;
        return buf;
    }

    var tmp: [77]u8 = undefined; // enough for 256-bit ints
    var i: usize = 0;

    while (n > 0) {
        tmp[i] = @intCast('0' + (n % 10));
        n /= 10;
        i += 1;
    }

    // reverse to correct order
    const out = try allocator.alloc(u8, i);
    for (out, 0..) |*d, j| {
        d.* = tmp[i - 1 - j];
    }
    return out;
}

```
