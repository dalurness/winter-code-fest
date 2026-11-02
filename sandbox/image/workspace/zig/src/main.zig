const std = @import("std");

pub fn main() !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();

    const args = try std.process.argsAlloc(arena.allocator());
    const name = if (args.len > 1) args[1] else "Winter Code Fest";

    var stdout_buffer: [1024]u8 = undefined;
    var stdout_writer = std.fs.File.stdout().writer(&stdout_buffer);
    const stdout = &stdout_writer.interface;

    for (1..4) |i| {
        try stdout.print("{d}: Hello, {s}!\n", .{ i, name });
    }
    try stdout.print("Zig {s}\n", .{@import("builtin").zig_version_string});
    try stdout.flush();
}
