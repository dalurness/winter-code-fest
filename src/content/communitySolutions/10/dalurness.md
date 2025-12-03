---
descriptions: ["zig"]
---

## 2025

#### Output

```
[0, 87, 175]
[22, 107, 114]
```

```zig
const std = @import("std");

const INF: u32 = 4294967295;

// Since all numbers are in order, I used kind of a pigeon-hole sort.
// When I have solved this previously it took 3 passes to read, sort, and then find the missing numbers.
// In this implementation it is 2 passes, the first reading and inserting in order, the second finding the missing numbers.

pub fn main() !void {
    const allocator = std.heap.page_allocator;
    const original_file = @embedFile("presents.txt");

    var presents = std.ArrayList(u32).empty;

    var i: u32 = 0;
    var start: u32 = 0;
    var size: usize = 0;

    // first pass
    while (true) {
        if (i + 1 == original_file.len) {
            const new_num = try std.fmt.parseInt(u32, original_file[start .. i + 1], 10);
            try insert(&allocator, &presents, new_num);
            size += 1;

            break;
        }
        if (original_file[i] == ' ') {
            const new_num = try std.fmt.parseInt(u32, original_file[start..i], 10);
            try insert(&allocator, &presents, new_num);
            size += 1;

            start = i + 1;
        }
        i += 1;
    }

    const first_center: u32 = @intCast(@divTrunc(size - 1, 2));
    const first: u32 = 0;
    var middle: u32 = INF;
    var next: u32 = INF;
    const last: u32 = presents.items[presents.items.len - 1];
    var missing_nums = std.ArrayList(usize).empty;
    var encountered: u32 = 0;

    // second pass
    for (presents.items, 0..) |pres, ind| {
        if (pres != INF) {
            // need the next in case we need the avg.
            if (middle != INF and next == INF) {
                next = pres;
            }
            // count up until we find the number at the "middle" which is the middle index minus the missing ones
            if (encountered == first_center) {
                middle = pres;
            }
            encountered += 1;
        } else {
            try missing_nums.append(allocator, ind);
        }
    }

    // need to print the median. If it is even numbers, then need to find avg.
    if (size % 2 == 0) {
        const added: f64 = @floatFromInt(next + middle);
        const ans: f64 = added / 2.0;
        std.debug.print("[{}, {}, {}]\n", .{ first, ans, last });
    } else {
        std.debug.print("[{}, {}, {}]\n", .{ first, middle, last });
    }

    std.debug.print("[", .{});
    for (missing_nums.items, 0..) |num, ind| {
        std.debug.print("{}", .{num});
        if (ind == missing_nums.items.len - 1) {
            std.debug.print("]\n", .{});
        } else {
            std.debug.print(", ", .{});
        }
    }
    std.debug.print("\n\n", .{});
}

// manually manage the allocation of the arraylist keeping it the size of the largest number so far
fn insert(allocator: *const std.mem.Allocator, list: *std.ArrayList(u32), new_num: u32) !void {
    if (new_num >= list.items.len) {
        try list.appendNTimes(allocator.*, INF, (new_num + 1) - list.items.len);
    }
    list.items[new_num] = new_num;
}
```
