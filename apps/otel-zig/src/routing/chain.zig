// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Route handler for the chain endpoint (GET /chain).
//! Simulates a CPU-bound workload so request latency is measurable via the
//! span and histogram recorded by the caller.

const std = @import("std");

/// Handles GET /chain by running a simulated workload and returning a JSON body.
/// The `operations` field is a fixed placeholder, not a computed count.
/// Caller owns the returned slice and must free it with `allocator`.
pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    // Simulate a chain of operations with some CPU work.
    // The accumulator is used in the response body below so the loop is not
    // eliminated as dead code in optimized builds.
    var sum: u64 = 0;
    for (0..1000000) |i| {
        sum +%= i;
    }

    const response = try std.fmt.allocPrint(
        allocator,
        \\{{"message": "Chain of operations completed", "operations": 3, "checksum": {d}}}
        \\
    ,
        .{sum & 0xFF},
    );

    return response;
}

test "chain handler returns completed message" {
    const body = try handler(std.testing.allocator);
    defer std.testing.allocator.free(body);
    try std.testing.expect(std.mem.indexOf(u8, body, "Chain of operations completed") != null);
}
