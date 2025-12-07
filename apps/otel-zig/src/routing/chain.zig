// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const std = @import("std");

pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    // Simulate a chain of operations with some CPU work
    var sum: u64 = 0;
    for (0..1000000) |i| {
        sum +%= i;
    }
    // Prevent optimization
    if (sum == 0) return error.Unexpected;

    const response = try std.fmt.allocPrint(
        allocator,
        \\{{"message": "Chain of operations completed", "operations": 3}}
        \\
        ,
        .{},
    );

    return response;
}
