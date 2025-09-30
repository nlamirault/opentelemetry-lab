// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;

use axum::Json;
use serde_json::{json, Value};
use tracing::{error, info};

pub async fn handler_chain() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Chain handler");

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