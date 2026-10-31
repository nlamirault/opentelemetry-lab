// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use tracing::info;

pub async fn handler_root() -> &'static str {
    info!(target: "otel_rust::handlers", "Root handler");
    "OpenTelemetry Lab / Rust"
}
