// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use anyhow;
use std::env;

use axum::{
    routing,
    Router,
};
use log;
use opentelemetry::KeyValue;
use opentelemetry::{global};
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_sdk::{propagation::TraceContextPropagator};
use opentelemetry::trace::{Span, Tracer, TracerProvider};
use serde_json::{Value, json};
use tokio::{net};
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{fmt, prelude::*, Registry};

mod otel;
use otel::create_resource;
use otel::create_logger;
use otel::create_tracer;
use otel::create_meter;


fn opentelemetry(service_name: &'static str) -> anyhow::Result<()> {

    let default_endpoint = "http://localhost:4317".to_string();
    let endpoint = env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or(default_endpoint);
    let protocol = env::var("OTEL_EXPORTER_OTLP_PROTOCOL").unwrap_or("http".to_string());
    let resource = create_resource(service_name);

    let logger_provider = create_logger(resource.clone(), endpoint.clone(), protocol.clone()).expect("failed to initialize logger");
    let meter_provider = create_meter(resource.clone(), endpoint.clone(), protocol.clone()).expect("failed to initialize meter");
    let tracer_provider = create_tracer(resource.clone(), endpoint.clone(), protocol.clone()).expect("failed to initialize tracer");

    let tracer = tracer_provider.tracer("ttembed");
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    let subscriber = Registry::default()
        .with(telemetry.with_filter(LevelFilter::INFO))
        .with(OpenTelemetryTracingBridge::new(&logger_provider).with_filter(LevelFilter::INFO))
        .with(fmt::Layer::default().with_filter(LevelFilter::DEBUG));

    tracing::subscriber::set_global_default(subscriber).unwrap();

    global::set_text_map_propagator(TraceContextPropagator::new());
    global::set_tracer_provider(tracer_provider.clone());
    global::set_meter_provider(meter_provider.clone());

    Ok(())
}


async fn handler_root() -> &'static str {
    log::info!("Root handler");
    let tracer = global::tracer("otel-rust");
    let mut span = tracer.start("root_handler");
    span.set_attribute(KeyValue::new("path", "/".to_string()));
    "OpenTelemetry Lab / Rust"
}

async fn handler_health() -> axum::Json<Value> {
    log::info!("Health handler");
    axum::Json(json!({ "status": "ok" }))
}

async fn handler_version() -> axum::Json<Value> {
    log::info!("Version handler");
    axum::Json(json!({ "version": "v1.0.0" }))
}

async fn handler_chain() -> axum::Json<Value> {
    log::info!("Chain handler");
    let target_one = env::var("TARGET_ONE_SVC")
        .ok()
        .unwrap_or("http://localhost:9999".to_string());
    let target_two = env::var("TARGET_TWO_SVC")
        .ok()
        .unwrap_or("http://localhost:9999".to_string());

    match reqwest::get(target_one.clone()).await {
        Ok(res) if res.status().is_success() => {
            log::info!("OK: {}", res.status());
        }
        Err(e) => {
          log::error!("failed to check health: {e}");
        }
        Ok(res) => {
          let status = res.status();
          log::info!("{target_one} returned {status}");
        }
    }

    match reqwest::get(target_two.clone()).await {
        Ok(res) if res.status().is_success() => {
            log::info!("OK: {}", res.status());
        }
        Err(e) => {
          log::error!("failed to check health: {e}");
        }
        Ok(res) => {
          let status = res.status();
          log::info!("{target_two} returned {status}");
        }
    }

    // let body = response.text().await?;
    // log::info!("Body:\n{}", body);

    axum::Json(json!({ "path": "/chain" }))
}

#[tokio::main]
async fn main() {
    let _ = opentelemetry("otel-rust");

    let app = Router::new()
        .route("/", routing::get(handler_root))
        .route("/chain", routing::get(handler_chain))
        .route("/version", routing::get(handler_version))
        .route("/health", routing::get(handler_health));

    log::info!("booting up server");
    let port = env::var("EXPOSE_PORT")
        .ok()
        .unwrap_or("9999".to_string());
    let listener = net::TcpListener::bind("0.0.0.0:".to_owned() + &port)
        .await
        .expect("Could not listen on port 9999");
    axum::serve(listener, app)
        .await
        .expect("Failed to start http api");

    opentelemetry::global::shutdown_tracer_provider();
}
