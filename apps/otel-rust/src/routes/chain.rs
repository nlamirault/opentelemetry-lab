// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;
use std::sync::LazyLock;
use std::time::Duration;

use axum::Json;
use opentelemetry::global;
use opentelemetry::trace::Status;
use opentelemetry_http::HeaderInjector;
use reqwest::header::HeaderMap;
use reqwest::StatusCode;
use serde_json::{json, Value};
use tracing::{error, info, info_span, Instrument};
use tracing_opentelemetry::OpenTelemetrySpanExt;

static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(1))
        .build()
        .expect("Failed to build HTTP client")
});

pub async fn handler_chain() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Chain handler");

    for var in ["TARGET_ONE_SVC", "TARGET_TWO_SVC"] {
        let target = env::var(var).unwrap_or_else(|_| "http://localhost:9999".to_string());
        match call(&target).await {
            Ok(status) if status.is_success() => {
                info!(target: "otel_rust::handlers", "OK: {status}");
            }
            Ok(status) => {
                info!(target: "otel_rust::handlers", "{target} returned {status}");
            }
            Err(e) => {
                error!(target: "otel_rust::handlers", "failed to call {target}: {e}");
            }
        }
    }

    Json(json!({ "path": "/chain" }))
}

/// Sends a GET request in a client span and propagates that span's context downstream.
async fn call(url: &str) -> Result<StatusCode, reqwest::Error> {
    let span = info_span!(
        "GET",
        otel.kind = "client",
        http.request.method = "GET",
        url.full = url
    );
    let mut headers = HeaderMap::new();
    global::get_text_map_propagator(|propagator| {
        propagator.inject_context(&span.context(), &mut HeaderInjector(&mut headers));
    });

    let result = CLIENT
        .get(url)
        .headers(headers)
        .send()
        .instrument(span.clone())
        .await;
    match &result {
        Ok(res) => {
            let status = res.status();
            span.set_attribute("http.response.status_code", i64::from(status.as_u16()));
            if status.is_client_error() || status.is_server_error() {
                span.set_status(Status::error(status.to_string()));
            }
        }
        Err(err) => span.set_status(Status::error(err.to_string())),
    }
    result.map(|res| res.status())
}
