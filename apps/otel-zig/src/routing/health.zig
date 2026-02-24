// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Route handler for the health check endpoint (GET /health).

const std = @import("std");

/// Handles GET /health and returns a JSON body indicating service liveness.
/// Caller owns the returned slice and must free it with `allocator`.
pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    const response = try std.fmt.allocPrint(
        allocator,
        \\{{"status": "ok"}}
        \\
    ,
        .{},
    );

    return response;
}

test "health handler returns ok status" {
    const body = try handler(std.testing.allocator);
    defer std.testing.allocator.free(body);
    try std.testing.expectEqualStrings("{\"status\": \"ok\"}\n", body);
}
