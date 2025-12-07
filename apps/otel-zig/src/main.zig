// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const std = @import("std");
const constants = @import("constants.zig");

// Import route handlers
const root_handler = @import("routing/root.zig");
const health_handler = @import("routing/health.zig");
const version_handler = @import("routing/version.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Get configuration from environment
    const service_name = std.posix.getenv("OTEL_SERVICE_NAME") orelse constants.DEFAULT_SERVICE_NAME;
    const port_str = std.posix.getenv("EXPOSE_PORT") orelse constants.DEFAULT_PORT;
    const port = try std.fmt.parseInt(u16, port_str, 10);

    // Setup server
    const address = std.net.Address.initIp4(.{ 0, 0, 0, 0 }, port);
    var server = try address.listen(.{
        .reuse_address = true,
    });
    defer server.deinit();

    std.debug.print("\n", .{});
    std.debug.print("==================================================\n", .{});
    std.debug.print("OpenTelemetry Lab - Zig Application\n", .{});
    std.debug.print("==================================================\n", .{});
    std.debug.print("Server listening on: http://0.0.0.0:{d}\n", .{port});
    std.debug.print("Service Name: {s}\n", .{service_name});
    std.debug.print("Version: {s}\n", .{constants.VERSION});
    std.debug.print("\nAvailable endpoints:\n", .{});
    std.debug.print("  GET /        - Root endpoint\n", .{});
    std.debug.print("  GET /health  - Health check\n", .{});
    std.debug.print("  GET /version - Version information\n", .{});
    std.debug.print("==================================================\n\n", .{});

    // Accept connections
    while (true) {
        const connection = try server.accept();

        // Handle connection in a new task (simplified, not truly async)
        handleConnection(allocator, connection) catch |err| {
            std.debug.print("Error handling connection: {}\n", .{err});
        };
    }
}

fn handleConnection(
    allocator: std.mem.Allocator,
    connection: std.net.Server.Connection,
) !void {
    defer connection.stream.close();

    var read_buffer: [8192]u8 = undefined;
    const bytes_read = try connection.stream.read(&read_buffer);

    if (bytes_read == 0) return;

    const request_str = read_buffer[0..bytes_read];

    // Parse the HTTP request line
    var lines = std.mem.splitScalar(u8, request_str, '\n');
    const request_line = lines.next() orelse return;

    var parts = std.mem.splitScalar(u8, request_line, ' ');
    const method = parts.next() orelse return;
    const path = parts.next() orelse return;

    // Log request
    std.debug.print("→ {s} {s}\n", .{ method, path });

    // Route handling
    const response_body = if (std.mem.eql(u8, path, "/"))
        try root_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/health"))
        try health_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/version"))
        try version_handler.handler(allocator)
    else
        try std.fmt.allocPrint(allocator, "{{\"error\": \"Not Found\"}}\n", .{});

    defer allocator.free(response_body);

    // Determine status and content type
    const status = if (std.mem.eql(u8, path, "/") or
        std.mem.eql(u8, path, "/health") or
        std.mem.eql(u8, path, "/version"))
        "200 OK"
    else
        "404 Not Found";

    const content_type = if (std.mem.eql(u8, path, "/"))
        "text/plain"
    else
        "application/json";

    // Build and send HTTP response
    const response = try std.fmt.allocPrint(
        allocator,
        "HTTP/1.1 {s}\r\nContent-Type: {s}\r\nContent-Length: {d}\r\nConnection: close\r\n\r\n{s}",
        .{ status, content_type, response_body.len, response_body },
    );
    defer allocator.free(response);

    _ = try connection.stream.writeAll(response);

    std.debug.print("← {s} {s}\n", .{ status, path });
}

test "constants" {
    try std.testing.expectEqualStrings("1.0.0", constants.VERSION);
    try std.testing.expectEqualStrings("otel-zig", constants.DEFAULT_SERVICE_NAME);
}
