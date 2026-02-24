// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Entry point for the otel-zig HTTP server.
//! Reads configuration from environment variables, starts a TCP listener,
//! and dispatches incoming requests to route handlers.

const std = @import("std");
const constants = @import("constants.zig");

const chain_handler = @import("routing/chain.zig");
const health_handler = @import("routing/health.zig");
const root_handler = @import("routing/root.zig");
const version_handler = @import("routing/version.zig");

const log = std.log.scoped(.otel_zig);

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Get configuration from environment
    const service_name = std.posix.getenv("OTEL_SERVICE_NAME") orelse constants.defaultServiceName;
    const port_str = std.posix.getenv("EXPOSE_PORT") orelse constants.defaultPort;
    const port = try std.fmt.parseInt(u16, port_str, 10);

    // Setup server
    const address = std.net.Address.initIp4(.{ 0, 0, 0, 0 }, port);
    var server = try address.listen(.{
        .reuse_address = true,
    });
    defer server.deinit();

    log.info("==================================================", .{});
    log.info("OpenTelemetry Lab - Zig Application", .{});
    log.info("==================================================", .{});
    log.info("Server listening on: http://0.0.0.0:{d}", .{port});
    log.info("Service Name: {s}", .{service_name});
    log.info("Version: {s}", .{constants.version});
    log.info("Available endpoints:", .{});
    log.info("  GET /        - Root endpoint", .{});
    log.info("  GET /health  - Health check", .{});
    log.info("  GET /version - Version information", .{});
    log.info("  GET /chain   - Chain of operations", .{});
    log.info("==================================================", .{});

    // Accept connections
    while (true) {
        const connection = try server.accept();

        // Handle connection in a new task (simplified, not truly async)
        handleConnection(allocator, connection) catch |err| {
            log.err("connection error: {}", .{err});
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

    log.info("-> {s} {s}", .{ method, path });

    // Route handling
    const response_body = if (std.mem.eql(u8, path, "/"))
        try root_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/health"))
        try health_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/version"))
        try version_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/chain"))
        try chain_handler.handler(allocator)
    else
        try std.fmt.allocPrint(allocator, "{{\"error\": \"Not Found\"}}\n", .{});

    defer allocator.free(response_body);

    // Determine status and content type
    const status = if (std.mem.eql(u8, path, "/") or
        std.mem.eql(u8, path, "/health") or
        std.mem.eql(u8, path, "/version") or
        std.mem.eql(u8, path, "/chain"))
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

    log.info("<- {s} {s}", .{ status, path });
}

// Register tests from all routing modules so `zig build test` picks them up.
test {
    _ = @import("routing/root.zig");
    _ = @import("routing/health.zig");
    _ = @import("routing/version.zig");
    _ = @import("routing/chain.zig");
}

test "constants" {
    try std.testing.expectEqualStrings("1.0.0", constants.version);
    try std.testing.expectEqualStrings("otel-zig", constants.defaultServiceName);
}
