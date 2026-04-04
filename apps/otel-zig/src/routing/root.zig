// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Route handler for the root endpoint (GET /).

const std = @import("std");

/// Handles GET / and returns a plain-text application identifier.
/// Caller owns the returned slice and must free it with `allocator`.
pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    const response = try std.fmt.allocPrint(
        allocator,
        "OpenTelemetry Lab / Zig\n",
        .{},
    );

    return response;
}

test "root handler returns application identifier" {
    const body = try handler(std.testing.allocator);
    defer std.testing.allocator.free(body);
    try std.testing.expectEqualStrings("OpenTelemetry Lab / Zig\n", body);
}
