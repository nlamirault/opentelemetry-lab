// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use axum::Json;
use serde_json::{json, Value};
use tracing::info;

pub async fn handler_health() -> Json<Value> {
    info!(target: "otel_rust::handlers", "Health handler");
    Json(json!({ "status": "ok" }))
}