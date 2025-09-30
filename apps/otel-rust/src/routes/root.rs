// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry::global;
use opentelemetry::trace::{Span, Tracer};
use opentelemetry::KeyValue;
use tracing::info;

pub async fn handler_root() -> &'static str {
    info!(target: "otel_rust::handlers", "Root handler");
    let tracer = global::tracer("otel-rust");
    let mut span = tracer.start("handle request");
    span.set_attribute(KeyValue::new("http.route", "/".to_string()));
    span.end();
    "OpenTelemetry Lab / Rust"
}