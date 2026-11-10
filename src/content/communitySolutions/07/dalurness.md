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
	"strings"
	"strconv"
)

type LocationValue string

var StartLocation LocationValue = "S"
var EndLocation LocationValue = "E"
var XLocation LocationValue = "X"
var OLocation LocationValue = "O"

var Up string = "N"
var Down string = "S"
var Left string = "W"
var Right string = "E"

type Location struct {
	x int
	y int
}

type FullMap map[Location]LocationValue
type VisitedMap map[Location]bool

func main() {
	start, end, fullMap, maxx, maxy := parseFile("/workspace/days/07/map.txt")

	fmt.Printf("dfs: %s\n", formatAnswer(dfs(start, end, fullMap, maxx, maxy)))
}

func formatAnswer(answer string) string {
	l := string(answer[0])
	count := 0
	finalString := ""
	for _, v := range answer {
		if string(v) == l {
			count += 1
			continue
		}
		finalString += strconv.Itoa(count)
		count = 1
		finalString += l
		l = string(v)
	}
	finalString += strconv.Itoa(count)
	finalString += l

	return finalString
}

func dfsSearch(loc Location, vm *VisitedMap, fm *FullMap, maxx int, maxy int, path string) string {
	// already visited
	if (*vm)[loc] {
		return ""
	}
	(*vm)[loc] = true
	// found it
	if (*fm)[loc] == EndLocation {
		return path
	}
	// mountain
	if (*fm)[loc] == XLocation {
		return ""
	}

	var up string
	var down string
	var right string
	// check right, return final direction attempt
	if loc.x + 1 < maxx {
		right = dfsSearch(Location{ loc.x + 1, loc.y}, vm, fm, maxx, maxy, path + Right)
		if right != "" {
			return right
		}
	}
	// check up
	if loc.y - 1 >= 0 {
		up = dfsSearch(Location{loc.x, loc.y - 1}, vm, fm, maxx, maxy, path + Up)
		if up != "" {
			return up
		}
	}
	// check down
	if loc.y + 1 < maxy {
		down = dfsSearch(Location{loc.x, loc.y + 1}, vm, fm, maxx, maxy, path + Down)
		if down != "" {
			return down
		}
	}
	// check left
	if loc.x - 1 >= 0 {
		return dfsSearch(Location{loc.x - 1, loc.y}, vm, fm, maxx, maxy, path + Left)
	}

	return ""
}

func dfs(start Location, end Location, fullMap FullMap, maxx int, maxy int) string {
	vm := make(VisitedMap, len(fullMap))

	return dfsSearch(start, &vm, &fullMap, maxx, maxy, "")
}

func parseFile(filename string) (start Location, end Location, fullMap FullMap, maxx int, maxy int) {
	content, err := os.ReadFile(filename)
	if err != nil {
		log.Fatalf("failed to open file %v\n", err)
	}
	
	lines := strings.Split(string(content), "\n")

	fullMap = make(FullMap)
	for y, line := range lines {
		for x, val := range line {
			var locVal LocationValue
			switch string(val) {
				case "S":
					maxx = len(line)
					locVal = StartLocation
					start = Location{x, y}
				case "E":
					locVal = EndLocation
					end = Location{x, y}
				case "X":
					locVal = XLocation
				case "O":
					locVal = OLocation
				default:
					log.Fatalf("unknown character: %s\n", val)
			}
			fullMap[Location{x, y}] = locVal
		}
	}

	return start, end, fullMap, maxx, len(lines)
}
```

</details>

## 2025

<details>
<summary>Show Zig Solution</summary>

#### Output

```
8N9E2N2E4N11E3N3E1N25E
```

```zig
const std = @import("std");

const LocType = enum {
    start,
    end,
    mountain,
    air,
};

const LocMeta = struct {
    value: LocType,
    visited: bool,
};

const Loc = struct {
    x: usize,
    y: usize,
};

const Path = struct {
    loc: Loc,
    path: std.ArrayList(u8),
};
pub fn main() !void {
    var file = try std.fs.cwd().openFile("./src/map.txt", .{ .mode = .read_only });
    defer file.close();

    var buf: [1024]u8 = undefined;
    var reader = file.reader(&buf);

    const allocator = std.heap.page_allocator;
    var locs = std.AutoHashMap(Loc, LocMeta).init(allocator);
    defer locs.deinit();

    var x_size: usize = 0;
    var x: usize = 0;
    var y: usize = 0;
    var start: Loc = undefined;
    while (reader.interface.takeDelimiterExclusive('\n')) |line| {
        x_size = line.len;
        for (line) |c| {
            switch (c) {
                'S' => {
                    const start_loc = Loc{ .x = x, .y = y };
                    start = start_loc;
                    try locs.put(start_loc, LocMeta{ .value = LocType.start, .visited = false });
                },
                'E' => {
                    try locs.put(Loc{ .x = x, .y = y }, LocMeta{ .value = LocType.end, .visited = false });
                },
                'O' => {
                    try locs.put(Loc{ .x = x, .y = y }, LocMeta{ .value = LocType.air, .visited = false });
                },
                'X' => {
                    try locs.put(Loc{ .x = x, .y = y }, LocMeta{ .value = LocType.mountain, .visited = false });
                },
                else => return error.InvalidCharacterType,
            }
            x += 1;
        }
        y += 1;
        x = 0;
    } else |err| if (err != error.EndOfStream) return err;

    const QType = struct {
        data: Path,
        node: std.DoublyLinkedList.Node = .{},
    };
    var q: std.DoublyLinkedList = .{};

    var first_node = try allocator.create(QType);
    first_node.* = .{ .data = .{
        .loc = start,
        .path = std.ArrayList(u8).empty,
    } };

    q.append(&first_node.node);

    var final_path: []u8 = &[_]u8{};
    defer allocator.free(final_path);
    while (q.popFirst()) |l| {
        const item: *QType = @fieldParentPtr("node", l);
        defer {
            item.data.path.deinit(allocator);
            allocator.destroy(item);
        }

        var meta: *LocMeta = undefined;
        if (locs.getPtr(item.data.loc)) |ptr| {
            meta = ptr;
        } else {
            return error.ItemNotInMap;
        }

        if (meta.value == LocType.mountain) {
            return error.RanIntoMountain;
        }

        if (meta.value == LocType.end) {
            final_path = try allocator.alloc(u8, item.data.path.items.len);
            @memmove(final_path, item.data.path.items[0..]);
            break;
        }

        // north
        if (item.data.loc.y != 0) {
            // only add if it hasn't been visited
            if (locs.getPtr(.{ .y = item.data.loc.y - 1, .x = item.data.loc.x })) |next_meta| {
                if (!next_meta.visited and !(next_meta.value == LocType.mountain)) {
                    next_meta.visited = true;
                    var north_node = try allocator.create(QType);
                    north_node.* = .{ .data = .{
                        .loc = Loc{
                            .y = item.data.loc.y - 1,
                            .x = item.data.loc.x,
                        },
                        .path = try std.ArrayList(u8).initCapacity(allocator, item.data.path.items.len + 1),
                    } };
                    try north_node.data.path.insertSlice(allocator, 0, item.data.path.items);
                    try north_node.data.path.append(allocator, 'N');
                    q.append(&north_node.node);
                }
            } else {
                return error.MissingMapLocation;
            }
        }

        // south
        if (item.data.loc.y + 1 < y) {
            // only add if it hasn't been visited
            if (locs.getPtr(.{ .y = item.data.loc.y + 1, .x = item.data.loc.x })) |next_meta| {
                if (!next_meta.visited and !(next_meta.value == LocType.mountain)) {
                    next_meta.visited = true;
                    var south_node = try allocator.create(QType);
                    south_node.* = .{ .data = .{
                        .loc = Loc{
                            .y = item.data.loc.y + 1,
                            .x = item.data.loc.x,
                        },
                        .path = try std.ArrayList(u8).initCapacity(allocator, item.data.path.items.len + 1),
                    } };
                    try south_node.data.path.insertSlice(allocator, 0, item.data.path.items);
                    try south_node.data.path.append(allocator, 'S');
                    q.append(&south_node.node);
                }
            } else {
                return error.MissingMapLocation;
            }
        }

        // east
        if (item.data.loc.x + 1 < x_size) {
            // only add if it hasn't been visited
            if (locs.getPtr(.{ .y = item.data.loc.y, .x = item.data.loc.x + 1 })) |next_meta| {
                if (!next_meta.visited and !(next_meta.value == LocType.mountain)) {
                    next_meta.visited = true;
                    var east_node = try allocator.create(QType);
                    east_node.* = .{ .data = .{
                        .loc = Loc{
                            .y = item.data.loc.y,
                            .x = item.data.loc.x + 1,
                        },
                        .path = try std.ArrayList(u8).initCapacity(allocator, item.data.path.items.len + 1),
                    } };
                    try east_node.data.path.insertSlice(allocator, 0, item.data.path.items);
                    try east_node.data.path.append(allocator, 'E');
                    q.append(&east_node.node);
                }
            } else {
                return error.MissingMapLocation;
            }
        }

        // west
        if (item.data.loc.x != 0) {
            // only add if it hasn't been visited
            if (locs.getPtr(.{ .y = item.data.loc.y, .x = item.data.loc.x - 1 })) |next_meta| {
                if (!next_meta.visited and !(next_meta.value == LocType.mountain)) {
                    next_meta.visited = true;
                    var west_node = try allocator.create(QType);
                    west_node.* = .{ .data = .{
                        .loc = Loc{
                            .y = item.data.loc.y,
                            .x = item.data.loc.x - 1,
                        },
                        .path = try std.ArrayList(u8).initCapacity(allocator, item.data.path.items.len + 1),
                    } };
                    try west_node.data.path.insertSlice(allocator, 0, item.data.path.items);
                    try west_node.data.path.append(allocator, 'W');
                    q.append(&west_node.node);
                }
            } else {
                return error.MissingMapLocation;
            }
        }
    }

    if (final_path.len > 0) {
        var letter = final_path[0];
        var count: usize = 0;
        for (final_path) |c| {
            if (c == letter) {
                count += 1;
            } else {
                std.debug.print("{}{c}", .{ count, letter });
                count = 1;
                letter = c;
            }
        }
        std.debug.print("{}{c}", .{ count, letter });
        std.debug.print("\n", .{});
    } else {
        std.debug.print("No final path\n", .{});
    }

    // cleanup queue
    while (q.pop()) |l| {
        const item: *QType = @fieldParentPtr("node", l);
        item.data.path.deinit(allocator);
        allocator.destroy(item);
    }
}
```

</details>
