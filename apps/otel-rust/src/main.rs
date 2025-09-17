// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use anyhow;
use std::env;

use axum::{routing, Router};
use log;
use opentelemetry::global;
use opentelemetry::trace::{Span, Tracer};
use opentelemetry::KeyValue;
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use serde_json::{json, Value};
use tokio::net;
use tracing::error;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

mod otel;
use otel::create_resource;
use otel::init_logger;
use otel::init_meter;
use otel::init_tracer;

fn setup_opentelemetry() -> anyhow::Result<()> {
    let default_endpoint = "http://localhost:4317".to_string();
    let endpoint = env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or(default_endpoint);
    let protocol = env::var("OTEL_EXPORTER_OTLP_PROTOCOL").unwrap_or("http".to_string());

    let resource = create_resource();
    let logger_provider = init_logger(resource.clone(), endpoint.clone(), protocol.clone());
    // .expect("failed to initialize logger");
    let meter_provider = init_meter(resource.clone(), endpoint.clone(), protocol.clone());
    // .expect("failed to initialize meter");
    let tracer_provider = init_tracer(resource.clone(), endpoint.clone(), protocol.clone());
    // .expect("failed to initialize tracer");

    // let tracer = tracer_provider.tracer("ttembed");
    // let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    let filter_otel = EnvFilter::new("info")
        .add_directive("hyper=off".parse().unwrap())
        .add_directive("opentelemetry=off".parse().unwrap())
        .add_directive("tonic=off".parse().unwrap())
        .add_directive("h2=off".parse().unwrap())
        .add_directive("reqwest=off".parse().unwrap());
    let otel_layer = OpenTelemetryTracingBridge::new(&logger_provider).with_filter(filter_otel);

    let filter_fmt = EnvFilter::new("info").add_directive("opentelemetry=debug".parse().unwrap());
    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_thread_names(true)
        .with_filter(filter_fmt);

    tracing_subscriber::registry()
        .with(otel_layer)
        .with(fmt_layer)
        .init();

    error!(name: "my-event-name", target: "my-system", event_id = 20, user_name = "otel", user_email = "otel@opentelemetry.io", message = "This is an example message");

    // let subscriber = Registry::default()
    //     .with(telemetry.with_filter(LevelFilter::INFO))
    //     .with(OpenTelemetryTracingBridge::new(&logger_provider).with_filter(LevelFilter::INFO))
    //     .with(fmt::Layer::default().with_filter(LevelFilter::DEBUG));
    // tracing::subscriber::set_global_default(subscriber).unwrap();

    global::set_text_map_propagator(TraceContextPropagator::new());
    global::set_tracer_provider(tracer_provider.clone());
    global::set_meter_provider(meter_provider.clone());

    // tracer_provider.shutdown()?;
    // meter_provider.shutdown()?;
    // logger_provider.shutdown()?;

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
    let _ = setup_opentelemetry();
    let app = Router::new()
        .route("/", routing::get(handler_root))
        .route("/chain", routing::get(handler_chain))
        .route("/version", routing::get(handler_version))
        .route("/health", routing::get(handler_health));

    log::info!("booting up server");
    let port = env::var("EXPOSE_PORT").ok().unwrap_or("9999".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = net::TcpListener::bind(&addr)
        .await
        .expect(format!("Could not listen on port {}", port).as_str());
    axum::serve(listener, app)
        .await
        .expect("Failed to start http api");

    // opentelemetry::global::shutdown_tracer_provider();
}
