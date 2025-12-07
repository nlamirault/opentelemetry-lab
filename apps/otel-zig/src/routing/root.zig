// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const std = @import("std");

pub fn handler(allocator: std.mem.Allocator) ![]const u8 {
    const response = try std.fmt.allocPrint(
        allocator,
        "OpenTelemetry Lab / Zig\n",
        .{},
    );

    return response;
}
