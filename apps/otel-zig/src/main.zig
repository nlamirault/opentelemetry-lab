// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Entry point for the otel-zig HTTP server.
//! Reads configuration from environment variables, starts a TCP listener,
//! and dispatches incoming HTTP requests to route handlers.
//!
//! OpenTelemetry signals:
//!   - Logs: custom std.log bridge forwards to an OTel LoggerProvider (stdout exporter)
//!   - Traces: each request produces a server span (stdout exporter)
//!   - Metrics: request count and latency recorded; exported every 15 s (stdout exporter)

const std = @import("std");
const sdk = @import("opentelemetry-sdk");
const constants = @import("constants.zig");

const chain_handler = @import("routing/chain.zig");
const health_handler = @import("routing/health.zig");
const root_handler = @import("routing/root.zig");
const version_handler = @import("routing/version.zig");

// ---------------------------------------------------------------------------
// std.log bridge — forwards all log calls to OTel AND mirrors to stderr via
// std.debug.print (active in debug builds; may be suppressed in release builds
// depending on the optimization level).
//
// Because the sdk.logs.Logger type is not re-exported from the SDK module,
// we use a minimal vtable to hold the type-erased emit function.
// ---------------------------------------------------------------------------

const LogBridge = struct {
    emit_fn: *const fn (ctx: *anyopaque, sev: u8, sev_text: []const u8, body: []const u8) void,
    ctx: *anyopaque,
};

/// Written exactly once in main() before server.accept() is called; subsequently
/// read from otelLogFn on any thread. No synchronization is needed because the
/// single write completes (and std.Thread.spawn creates a memory barrier) before
/// any concurrent reader can observe the value. If connection handling is ever
/// moved to worker threads, this assumption must be re-evaluated.
var g_log_bridge: ?LogBridge = null;

/// Controls the background metrics-collector thread. Set to true before joining.
var g_metrics_stop = std.atomic.Value(bool).init(false);

pub const std_options: std.Options = .{ .logFn = otelLogFn };

fn otelLogFn(
    comptime level: std.log.Level,
    comptime scope: @TypeOf(.enum_literal),
    comptime format: []const u8,
    args: anytype,
) void {
    const level_txt = comptime level.asText();
    const scope_txt = "(" ++ @tagName(scope) ++ ") ";

    // Mirror to stderr via std.debug.print. Active in debug builds; may be
    // suppressed in release builds depending on optimization flags.
    std.debug.print(level_txt ++ ": " ++ scope_txt ++ format ++ "\n", args);

    // Forward to the OTel LoggerProvider when configured.
    if (g_log_bridge) |bridge| {
        var msg_buf: [4096]u8 = undefined;
        const msg = std.fmt.bufPrint(&msg_buf, format, args) catch msg_buf[0..];
        // OTel Log Data Model severity numbers (spec §4.1):
        //   DEBUG=5, INFO=9, WARN=13, ERROR=17
        const sev: u8 = switch (level) {
            .err => 17,
            .warn => 13,
            .info => 9,
            .debug => 5,
        };
        // NOTE: logger.emit returns void; errors inside the SDK emit path
        // cannot be surfaced here. Calling log.* inside this function would
        // cause infinite recursion.
        bridge.emit_fn(bridge.ctx, sev, level_txt, msg);
    }
}

const log = std.log.scoped(.otel_zig);

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const service_name = std.posix.getenv("OTEL_SERVICE_NAME") orelse constants.defaultServiceName;
    const port_str = std.posix.getenv("EXPOSE_PORT") orelse constants.defaultPort;
    const port = std.fmt.parseInt(u16, port_str, 10) catch |err| {
        std.debug.print(
            "ERROR: EXPOSE_PORT='{s}' is not a valid port number (1-65535): {}\n",
            .{ port_str, err },
        );
        std.process.exit(1);
    };

    // -----------------------------------------------------------------------
    // Logs — LoggerProvider + BatchingLogRecordProcessor + StdoutExporter
    // -----------------------------------------------------------------------
    const LogWriterType = std.io.GenericWriter(std.fs.File, std.fs.File.WriteError, std.fs.File.write);
    var log_exporter = sdk.logs.StdoutExporter.init(LogWriterType{ .context = std.fs.File.stdout() });
    const log_record_exporter = log_exporter.asLogRecordExporter();

    var batch_processor = try sdk.logs.BatchingLogRecordProcessor.init(
        allocator,
        log_record_exporter,
        .{
            .max_queue_size = 512,
            .scheduled_delay_millis = 5_000,
            .max_export_batch_size = 64,
        },
    );
    defer {
        const proc = batch_processor.asLogRecordProcessor();
        // Use std.debug.print here: the log bridge may already be torn down
        // at this point, and shutdown() flushes the final in-flight log records.
        proc.shutdown() catch |err| {
            std.debug.print("ERROR: log processor shutdown failed, logs may be lost: {}\n", .{err});
        };
        batch_processor.deinit();
    }

    const log_resource = try sdk.attributes.Attributes.from(allocator, .{
        "service.name",    service_name,
        "service.version", @as([]const u8, constants.version),
    });
    defer if (log_resource) |r| allocator.free(r);

    var log_provider = try sdk.logs.LoggerProvider.init(allocator, log_resource);
    defer log_provider.deinit();
    try log_provider.addLogRecordProcessor(batch_processor.asLogRecordProcessor());

    // Wire std.log → LoggerProvider via the type-erased bridge.
    const logger_scope = sdk.InstrumentationScope{ .name = service_name, .version = constants.version };
    const otel_log = try log_provider.getLogger(logger_scope);
    const LoggerEmitBridge = struct {
        fn emitFn(ctx: *anyopaque, sev: u8, sev_text: []const u8, body: []const u8) void {
            const logger = @as(@TypeOf(otel_log), @ptrCast(@alignCast(ctx)));
            logger.emit(sev, sev_text, body, null);
        }
    };
    g_log_bridge = LogBridge{
        .emit_fn = LoggerEmitBridge.emitFn,
        .ctx = otel_log,
    };

    // -----------------------------------------------------------------------
    // Traces — TracerProvider + SimpleProcessor + StdOutExporter
    // -----------------------------------------------------------------------
    // Use system entropy for the PRNG seed to avoid predictable IDs.
    var seed: u64 = undefined;
    std.crypto.random.bytes(std.mem.asBytes(&seed));
    var prng = std.Random.DefaultPrng.init(seed);
    const id_generator = sdk.trace.IDGenerator{
        .Random = sdk.trace.RandomIDGenerator.init(prng.random()),
    };

    var tracer_provider = try sdk.trace.TracerProvider.init(allocator, id_generator);
    defer tracer_provider.shutdown();

    var trace_stdout_buffer: [4096]u8 = undefined;
    var trace_exporter = sdk.trace.StdOutExporter.init(std.fs.File.stdout().writer(&trace_stdout_buffer));
    var trace_processor = sdk.trace.SimpleProcessor.init(allocator, trace_exporter.asSpanExporter());
    try tracer_provider.addSpanProcessor(trace_processor.asSpanProcessor());

    const tracer = try tracer_provider.getTracer(.{
        .name = service_name,
        .version = constants.version,
    });

    // -----------------------------------------------------------------------
    // Metrics — MeterProvider + MetricReader + StdoutExporter
    // A background thread calls collect() every 15 s so output is visible.
    // -----------------------------------------------------------------------
    const mp = try sdk.metrics.MeterProvider.default();
    defer mp.shutdown();

    const me = try sdk.metrics.MetricExporter.Stdout(allocator, null, null);
    defer me.stdout.deinit();

    const mr = try sdk.metrics.MetricReader.init(allocator, me.exporter);
    defer mr.shutdown();
    try mp.addReader(mr);

    const meter = try mp.getMeter(.{ .name = service_name });

    const request_counter = try meter.createCounter(u64, .{
        .name = "http.server.requests",
        .description = "Total number of HTTP requests received",
    });
    const request_duration = try meter.createHistogram(f64, .{
        .name = "http.server.request_duration_ms",
        .description = "Duration of HTTP requests in milliseconds",
        .unit = "ms",
    });

    // Background thread: export metrics every 15 s.
    // The defer below signals the stop flag and joins the thread before
    // mr.shutdown() / mp.shutdown() run (defers execute in LIFO order),
    // preventing a use-after-free on the MetricReader. Shutdown may block
    // up to 15 s waiting for the current sleep interval to complete.
    const MetricsCollector = struct {
        fn run(reader: *sdk.metrics.MetricReader) void {
            while (!g_metrics_stop.load(.acquire)) {
                std.Thread.sleep(15 * std.time.ns_per_s);
                if (g_metrics_stop.load(.acquire)) break;
                reader.collect() catch |err| {
                    std.log.err("metrics collect failed: {}", .{err});
                };
            }
        }
    };
    const metrics_thread = try std.Thread.spawn(.{}, MetricsCollector.run, .{mr});
    defer {
        g_metrics_stop.store(true, .release);
        metrics_thread.join();
    }

    // -----------------------------------------------------------------------
    // HTTP server
    // -----------------------------------------------------------------------
    const address = std.net.Address.initIp4(.{ 0, 0, 0, 0 }, port);
    var server = try address.listen(.{ .reuse_address = true });
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

    while (true) {
        const connection = try server.accept();
        handleConnection(allocator, connection, tracer, request_counter, request_duration) catch |err| {
            log.err("connection error: {}", .{err});
        };
    }
}

// Processes one HTTP request from `connection`.
// NOTE: The request is read in a single call; payloads exceeding 8 192 bytes
// will be truncated. This is intentional for this demo and not production-safe.
// NOTE: Per OTel semantic conventions, span status reflects server-side errors
// (5xx) only; 4xx client errors are recorded with Status.ok().
fn handleConnection(
    allocator: std.mem.Allocator,
    connection: std.net.Server.Connection,
    tracer: anytype,
    request_counter: *sdk.metrics.Counter(u64),
    request_duration: *sdk.metrics.Histogram(f64),
) !void {
    defer connection.stream.close();

    const start = std.time.milliTimestamp();

    var read_buffer: [8192]u8 = undefined;
    const bytes_read = try connection.stream.read(&read_buffer);
    if (bytes_read == 0) {
        log.debug("connection closed before sending data", .{});
        return;
    }

    const request_str = read_buffer[0..bytes_read];
    var lines = std.mem.splitScalar(u8, request_str, '\n');
    const raw_request_line = lines.next() orelse {
        log.warn("malformed request: no request line", .{});
        return;
    };
    // HTTP lines end with \r\n; trim the trailing \r for robust parsing.
    const request_line = std.mem.trimRight(u8, raw_request_line, "\r");

    var parts = std.mem.splitScalar(u8, request_line, ' ');
    const method = parts.next() orelse {
        log.warn("malformed request line (no method): '{s}'", .{request_line});
        return;
    };
    const path = parts.next() orelse {
        log.warn("malformed request line (no path): '{s}'", .{request_line});
        return;
    };

    log.info("-> {s} {s}", .{ method, path });

    // Start a server span covering the full request lifetime.
    const span_attrs = try sdk.Attributes.from(allocator, .{
        "http.request.method", method,
        "url.path",            path,
    });
    defer if (span_attrs) |a| allocator.free(a);

    var span = try tracer.startSpan(allocator, path, .{
        .kind = .Server,
        .attributes = span_attrs,
    });
    defer span.deinit();

    const is_known_route =
        std.mem.eql(u8, path, "/") or
        std.mem.eql(u8, path, "/health") or
        std.mem.eql(u8, path, "/version") or
        std.mem.eql(u8, path, "/chain");

    // Route handling — errors are caught here so we can write an HTTP 500
    // response rather than closing the connection silently.
    var handler_err = false;
    const maybe_body: anyerror![]const u8 = if (std.mem.eql(u8, path, "/"))
        root_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/health"))
        health_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/version"))
        version_handler.handler(allocator)
    else if (std.mem.eql(u8, path, "/chain"))
        chain_handler.handler(allocator)
    else
        std.fmt.allocPrint(allocator, "{{\"error\": \"Not Found\"}}\n", .{});

    const response_body = maybe_body catch |err| blk: {
        log.err("handler error for {s}: {}", .{ path, err });
        handler_err = true;
        break :blk try std.fmt.allocPrint(allocator, "{{\"error\": \"Internal Server Error\"}}\n", .{});
    };
    defer allocator.free(response_body);

    const status_code: i64 = if (handler_err) 500 else if (is_known_route) 200 else 404;
    const status = if (handler_err)
        "500 Internal Server Error"
    else if (is_known_route)
        "200 OK"
    else
        "404 Not Found";
    const content_type = if (std.mem.eql(u8, path, "/")) "text/plain" else "application/json";

    // Record metrics (failures are non-fatal for the request).
    request_counter.add(1, .{
        "http.request.method",       method,
        "url.path",                  path,
        "http.response.status_code", status_code,
    }) catch |err| log.warn("counter add failed: {}", .{err});

    const elapsed: f64 = @floatFromInt(std.time.milliTimestamp() - start);
    request_duration.record(elapsed, .{ "url.path", path }) catch |err|
        log.warn("histogram record failed: {}", .{err});

    // Annotate span with response status and close it.
    // Per OTel semantic conventions, span status is set to error only for 5xx.
    span.setAttribute("http.response.status_code", .{ .int = status_code }) catch |err|
        log.warn("failed to set span attribute http.response.status_code: {}", .{err});
    span.setStatus(if (handler_err)
        sdk.api.trace.Status.error_with_description("Internal Server Error")
    else
        sdk.api.trace.Status.ok());
    span.end(null);

    // Build and send HTTP response.
    const response = try std.fmt.allocPrint(
        allocator,
        "HTTP/1.1 {s}\r\nContent-Type: {s}\r\nContent-Length: {d}\r\nConnection: close\r\n\r\n{s}",
        .{ status, content_type, response_body.len, response_body },
    );
    defer allocator.free(response);

    try connection.stream.writeAll(response);

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
