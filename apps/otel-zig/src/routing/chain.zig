// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Route handler for the chain endpoint (GET /chain).
//! Simulates a multi-step CPU-bound operation to demonstrate tracing spans.

const std = @import("std");

/// Handles GET /chain by running a simulated workload and returning
/// a JSON summary of the completed operations.
/// Caller owns the returned slice and must free it with `allocator`.
pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    // Simulate a chain of operations with some CPU work
    var sum: u64 = 0;
    for (0..1000000) |i| {
        sum +%= i;
    }
    // Prevent the loop from being optimized away
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

test "chain handler returns completed message" {
    const body = try handler(std.testing.allocator);
    defer std.testing.allocator.free(body);
    try std.testing.expect(std.mem.indexOf(u8, body, "Chain of operations completed") != null);
}
