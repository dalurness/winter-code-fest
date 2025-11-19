---
descriptions: ["zig"]
---

## 2025

#### Output

```
5: 7 --- Elapsed time: 0 ms
6: 14 --- Elapsed time: 0 ms
7: 23 --- Elapsed time: 0 ms
8: 39 --- Elapsed time: 0 ms
9: 71 --- Elapsed time: 0 ms
10: 123 --- Elapsed time: 0 ms
11: 211 --- Elapsed time: 0 ms
12: 372 --- Elapsed time: 0 ms
13: 647 --- Elapsed time: 1 ms
14: 1123 --- Elapsed time: 0 ms
15: 1967 --- Elapsed time: 1 ms
16: 3426 --- Elapsed time: 2 ms
17: 5961 --- Elapsed time: 3 ms
18: 10405 --- Elapsed time: 5 ms
19: 18134 --- Elapsed time: 8 ms
20: 31593 --- Elapsed time: 11 ms
21: 55094 --- Elapsed time: 17 ms
22: 96030 --- Elapsed time: 26 ms
23: 167357 --- Elapsed time: 38 ms
24: 291758 --- Elapsed time: 67 ms
25: 508564 --- Elapsed time: 113 ms
26: 886414 --- Elapsed time: 192 ms
27: 1545162 --- Elapsed time: 336 ms
28: 2693373 --- Elapsed time: 581 ms
29: 4694687 --- Elapsed time: 1011 ms
30: 8183372 --- Elapsed time: 1773 ms
31: 14264404 --- Elapsed time: 3082 ms
32: 24863958 --- Elapsed time: 5347 ms
33: 43340305 --- Elapsed time: 9354 ms
34: 75546198 --- Elapsed time: 16439 ms
35: 131683574 --- Elapsed time: 28413 ms
```

```zig
const std = @import("std");

pub fn main() !void {
    for (5..40) |i| {
        const start = std.time.milliTimestamp(); // time in milliseconds
        const the_number = i;
        var total_count: u64 = 0;

        try findNumber(&total_count, 0, the_number, 0);

        const end = std.time.milliTimestamp();
        const duration = end - start;
        std.debug.print("{}: {} --- Elapsed time: {} ms\n", .{ i, total_count, duration });
    }
}

fn findNumber(result_total: *u64, prev_number: u64, goal_number: u64, current_value: u64) !void {
    for (1..10) |_i| {
        const i = @as(u64, @intCast(_i));
        if (current_value == goal_number) {
            result_total.* += 1;
            return;
        }
        if (current_value > goal_number or (prev_number == i)) {
            continue;
        }

        try findNumber(result_total, i, goal_number, current_value + i);
    }
}
```

<details>
<summary>naive organization display solution</summary>

```zig
    const std = @import("std");

    pub fn main() !void {
    const allocator = std.heap.page_allocator;
    const the_number = 20;
    var all_lists = std.ArrayList(std.ArrayList(u32)).empty;
    defer all_lists.deinit(allocator);

        const initial_list = std.ArrayList(u32).empty;
        try findNumber(allocator, &all_lists, initial_list, the_number, 0);

        std.debug.print("{}\n", .{all_lists.items.len});

        for (all_lists.items) |l| {
            var list = l;
            for (list.items) |i| {
                std.debug.print("{},", .{i});
            }
            std.debug.print("\n", .{});
            list.deinit(allocator);
        }

    }

    fn findNumber(allocator: std.mem.Allocator, good_results: \*std.ArrayList(std.ArrayList(u32)), current_list: std.ArrayList(u32), goal_number: u32, current_value: u32) !void {
    var list = current_list;
    for (1..10) |\_i| {
    const i = @as(u32, @intCast(\_i));
    if (current_value == goal_number) {
    try good_results.append(allocator, list);
    return;
    }
    if (current_value > goal_number or (list.items.len > 0 and list.items[list.items.len - 1] == i)) {
    continue;
    }
    var new_list = try std.ArrayList(u32).initCapacity(allocator, list.items.len + 1);
    try new_list.insertSlice(allocator, 0, list.items);
    try new_list.append(allocator, i);

            try findNumber(allocator, good_results, new_list, goal_number, current_value + i);
        }
        list.deinit(allocator);

    }

```

</details>
