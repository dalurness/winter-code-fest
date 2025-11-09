---
descriptions: ["zig"]
---

### 2025 Solution Zig

### Output

```
Total Time: 2110
```

```zig
const std = @import("std");

const Elf = struct {
    speed: f32,
    workload: usize,

    fn getNewWorkload(self: *Elf, workload: usize) void {
        const fworkload = @as(f32, @floatFromInt(workload));
        const elf_workload: usize = @intFromFloat(@ceil(fworkload / self.speed));
        self.workload = self.workload + elf_workload + 1; // add one for getting up to get another
    }

    fn subtractTime(self: *Elf, amount: usize) void {
        self.workload -= amount;
    }
};
pub fn main() !void {
    const allocator = std.heap.page_allocator;
    const original_file: []const u8 = @embedFile("presents.txt");
    const file: []const u8 = original_file;

    var i: usize = 0;
    var presents = try std.ArrayList(usize).initCapacity(allocator, 0);
    defer presents.deinit(allocator);


    while (i < file.len) {
        // find each number
        var j: usize = 0;
        while (true) {
            if ((i + j == file.len) or (file[i + j] == ' ')) {
                const new_number = try std.fmt.parseInt(usize, file[i..(i + j)], 10);
                try presents.append(allocator, new_number);
                i = i + j + 1;
                break;
            } else {
                j += 1;
            }
        }
    }
    var elf1: Elf = .{
        .speed = 1.4,
        .workload = 0,
    };
    var elf2: Elf = .{
        .speed = 1.4,
        .workload = 0,
    };
    var elf3: Elf = .{
        .speed = 1.4,
        .workload = 0,
    };
    var elf4: Elf = .{
        .speed = 1.4,
        .workload = 0,
    };

    const elves = [4]*Elf{
        &elf1,
        &elf2,
        &elf3,
        &elf4,
    };

    var workloads: [4]usize = undefined;
    var next_present: usize = 0;
    var total_time: usize = 0;
    while (true) {
        for (elves, 0..) |e, ind| {
            workloads[ind] = e.workload;
        }

        const max_workload = maxInt(&workloads);
        const min_workload = minInt(&workloads, max_workload);
        if (max_workload == 0 and next_present == presents.items.len) break;
        total_time += min_workload;
        for (elves) |e| {
            if (e.workload != 0) {
                e.subtractTime(min_workload);
            }
            if (e.workload == 0 and next_present < presents.items.len) {
                e.getNewWorkload(presents.items[next_present]);
                next_present += 1;
            }
        }
    }

    std.debug.print("Total Time: {}", .{total_time});
}

fn minInt(nums: []usize, max_int: usize) usize {
    var min = max_int;
    if (min == 0) {
        return min;
    }
    for (nums[0..]) |n| {
        if (n < min and n > 0) min = n;
    }
    return min;
}

fn maxInt(nums: []usize) usize {
    var max = nums[0];
    for (nums[1..]) |n| {
        if (n > max) max = n;
    }
    return max;
}
```
