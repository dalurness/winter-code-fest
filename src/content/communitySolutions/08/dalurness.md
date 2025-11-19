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
10: 124 --- Elapsed time: 0 ms
11: 214 --- Elapsed time: 0 ms
12: 378 --- Elapsed time: 0 ms
13: 661 --- Elapsed time: 0 ms
14: 1152 --- Elapsed time: 1 ms
15: 2024 --- Elapsed time: 1 ms
16: 3542 --- Elapsed time: 3 ms
17: 6189 --- Elapsed time: 6 ms
18: 10843 --- Elapsed time: 10 ms
19: 18978 --- Elapsed time: 22 ms
20: 33202 --- Elapsed time: 42 ms
21: 58130 --- Elapsed time: 81 ms
22: 101742 --- Elapsed time: 147 ms
23: 178045 --- Elapsed time: 280 ms
24: 311648 --- Elapsed time: 539 ms
25: 545470 --- Elapsed time: 1025 ms
26: 954658 --- Elapsed time: 1948 ms
27: 1670919 --- Elapsed time: 3614 ms
28: 2924536 --- Elapsed time: 6833 ms
29: 5118559 --- Elapsed time: 12838 ms
30: 8958772 --- Elapsed time: 24008 ms
31: 15680073 --- Elapsed time: 45041 ms
32: 27443763 --- Elapsed time: 84500 ms
33: 48033284 --- Elapsed time: 154171 ms
```

```zig
const std = @import("std");

pub fn main() !void {
    for (5..34) |i| {
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
    for (1..goal_number + 1) |_i| {
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
