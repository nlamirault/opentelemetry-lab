// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Route handler for the version endpoint (GET /version).

const std = @import("std");
const constants = @import("../constants.zig");

/// Handles GET /version and returns a JSON body with the application version.
/// Caller owns the returned slice and must free it with `allocator`.
pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    const response = try std.fmt.allocPrint(
        allocator,
        \\{{"version": "{s}"}}
        \\
    ,
        .{constants.version},
    );

    return response;
}

test "version handler returns version from constants" {
    const body = try handler(std.testing.allocator);
    defer std.testing.allocator.free(body);
    try std.testing.expectEqualStrings("{\"version\": \"1.0.0\"}\n", body);
}
