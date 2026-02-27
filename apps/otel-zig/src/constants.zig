// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

//! Application-wide constants for the otel-zig service.

/// Semantic version of this application.
pub const version = "1.0.0";

/// Default OpenTelemetry service name reported in telemetry.
pub const defaultServiceName = "otel-zig";

/// Default HTTP port the server binds to when EXPOSE_PORT is unset.
pub const defaultPort = "8888";
