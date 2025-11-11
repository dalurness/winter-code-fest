---
descriptions: ["zig", "go"]
---

### 2025 Solution Zig

#### Output

```
Total Off Balance Weight: 580
```

```zig
const std = @import("std");

pub fn main() !void {
    var file = try std.fs.cwd().openFile("./src/trees.txt", .{ .mode = .read_only });
    defer file.close();

    var buf: [1024]u8 = undefined;
    var reader = file.reader(&buf);

    var off_balance_total: isize = 0;
    var lw: isize = 0;
    var rw: isize = 0;
    var tw: isize = 0;
    var nums: [4]isize = undefined;

    while (reader.interface.takeDelimiterExclusive('\n')) |line| {
        switch (line.len) {
            1 => {
                nums[0] = try parseNum(line[0]);
                tw += nums[0];
            },
            3 => {
                nums[0] = try parseNum(line[0]);
                nums[1] = try parseNum(line[2]);
                lw += nums[0];
                rw += nums[1];
            },
            7 => {
                nums[0] = try parseNum(line[0]);
                nums[1] = try parseNum(line[2]);
                nums[2] = try parseNum(line[4]);
                nums[3] = try parseNum(line[6]);
                lw += (nums[0] + nums[1]);
                rw += (nums[2] + nums[3]);

                // finish calcs for this tree
                if (@abs(lw - rw) > 1) {
                    off_balance_total += (lw + rw + tw);
                }
                lw = 0;
                rw = 0;
                tw = 0;
            },
            0 => {},
            else => return error.UnexpectedWeight,
        }
    } else |err| if (err != error.EndOfStream) return err;

    std.debug.print("Total Off Balance Weight: {}\n", .{off_balance_total});
}

fn parseNum(c: u8) !isize {
    if (c == '_') return 0;
    return try std.fmt.parseInt(isize, &[_]u8{c}, 10);
}

```

### 2024 Solution Go

```go
package main

import (
    "fmt"
    "os"
    "strconv"
    "strings"
)

func absDiffInt(x, y int) int {
    if x < y {
        return y - x
    }
    return x - y
}

func main() {
    dat, err := os.ReadFile("../trees.txt")
    if err != nil {
        panic("failed to read file")
    }

    trees := strings.Split(string(dat[:]), "\n\n")

    totalOffBalanceWeight := 0
    for _, tree := range trees {
        parts := strings.Split(tree, "\n")
        trunkWeight, err := strconv.Atoi(parts[0])
        if err != nil {
            panic("trunc value incorrect")
        }

        leftWeight := 0
        rightWeight := 0
        limbsStrings := strings.Split(parts[1], " ")
        leftLimb, err := strconv.Atoi(limbsStrings[0])
        if err != nil {
            panic("failed converting left limb amount")
        }
        leftWeight = leftWeight + leftLimb
        rightLimb, err := strconv.Atoi(limbsStrings[1])
        if err != nil {
            panic("failed to convert right limb")
        }
        rightWeight = rightWeight + rightLimb

        ornamentsStrings := strings.Split(parts[2], " ")
        lOrn1, err := strconv.Atoi(ornamentsStrings[0])
        if err == nil {
            leftWeight = leftWeight + lOrn1
        }
        lOrn2, err := strconv.Atoi(ornamentsStrings[1])
        if err == nil {
            leftWeight = leftWeight + lOrn2
        }
        rOrn1, err := strconv.Atoi(ornamentsStrings[2])
        if err == nil {
            rightWeight = rightWeight + rOrn1
        }
        rOrn2, err := strconv.Atoi(ornamentsStrings[3])
        if err == nil {
            rightWeight = rightWeight + rOrn2
        }
        if absDiffInt(leftWeight, rightWeight) > 1 {
            totalOffBalanceWeight = totalOffBalanceWeight + leftWeight + rightWeight + trunkWeight
            fmt.Printf("Tree weight: %d\n", leftWeight+rightWeight+trunkWeight)
        }
    }

    fmt.Printf("Total: %d\n", totalOffBalanceWeight)
}
```
