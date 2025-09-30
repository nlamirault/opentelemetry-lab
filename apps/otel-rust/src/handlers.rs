// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;

use axum::Json;
use opentelemetry::global;
use opentelemetry::trace::{Span, Tracer};
use opentelemetry::KeyValue;
use serde_json::{json, Value};
use tracing::{error, info};

pub async fn handler_root() -> &'static str {
    // &'static str {
    info!(target: "otel_rust::handlers", "Root handler");
    let tracer = global::tracer("otel-rust");
    let mut span = tracer.start("handle request");
    span.set_attribute(KeyValue::new("http.route", "/".to_string()));
    span.end();
    "OpenTelemetry Lab / Rust"
}

pub async fn handler_health() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Health handler");
    Json(json!({ "status": "ok" }))
}

pub async fn handler_version() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Version handler");
    Json(json!({ "version": "v1.0.0" }))
}

pub async fn handler_chain() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Chain handler");

    // let mut _span = tracer
    //     .span_builder("Call to /myendpoint")
    //     .with_kind(SpanKind::Internal)
    //     .start(&tracer);
    // _span.set_attribute(KeyValue::new("http.method", "GET"));
    // _span.set_attribute(KeyValue::new("net.protocol.version", "1.1"));

    // TODO: Your code goes here

    // span.end();

    let target_one = env::var("TARGET_ONE_SVC")
        .ok()
        .unwrap_or("http://localhost:9999".to_string());
    let target_two = env::var("TARGET_TWO_SVC")
        .ok()
        .unwrap_or("http://localhost:9999".to_string());

    match reqwest::get(target_one.clone()).await {
        Ok(res) if res.status().is_success() => {
            info!(target: "otel_rust::handlers", "OK: {}", res.status());
        }
        Err(e) => {
            error!(target: "otel_rust::handlers", "failed to check health: {e}");
        }
        Ok(res) => {
            let status = res.status();
            info!(target: "otel_rust::handlers", "{target_one} returned {status}");
        }
    }

    match reqwest::get(target_two.clone()).await {
        Ok(res) if res.status().is_success() => {
            info!(target: "otel_rust::handlers", "OK: {}", res.status());
        }
        Err(e) => {
            error!(target: "otel_rust::handlers", "failed to check health: {e}");
        }
        Ok(res) => {
            let status = res.status();
            info!(target: "otel_rust::handlers", "{target_two} returned {status}");
        }
    }

    Json(json!({ "path": "/chain" }))
}
