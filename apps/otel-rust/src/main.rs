// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use anyhow;
use std::env;

use axum::{routing, Router};
use opentelemetry::global;
use opentelemetry::metrics::MeterProvider;
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use tokio::net;
use tracing::info;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

mod routes;
mod otel;
mod constants;

use routes::{handler_chain, handler_health, handler_root, handler_version};
use otel::{create_resource, init_logger, init_meter, init_tracer};
use constants::METRIC_BUILD_INFO;

fn setup_opentelemetry() -> anyhow::Result<()> {
    let default_endpoint = "http://localhost:4317".to_string();
    let endpoint = env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or(default_endpoint);
    let protocol = env::var("OTEL_EXPORTER_OTLP_PROTOCOL").unwrap_or("http".to_string());

    let resource = create_resource();
    let logger_provider = init_logger(resource.clone(), endpoint.clone(), protocol.clone());
    let meter_provider = init_meter(resource.clone(), endpoint.clone(), protocol.clone());
    let tracer_provider = init_tracer(resource.clone(), endpoint.clone(), protocol.clone());

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

    info!(target: "otel_rust::setup_opentelemetry", message = "Setup OpenTelemetry done");

    global::set_text_map_propagator(TraceContextPropagator::new());
    global::set_tracer_provider(tracer_provider);
    global::set_meter_provider(meter_provider.clone());

    // Create build info metric
    let meter = meter_provider.meter("otel-rust");
    let build_info = meter
        .u64_counter(METRIC_BUILD_INFO)
        .with_description("Build information for the OpenTelemetry lab application")
        .build();
    let service_name = env::var("OTEL_SERVICE_NAME").unwrap_or("otel-rust".to_string());
    build_info.add(
        1,
        &[
            opentelemetry::KeyValue::new("language", "rust"),
            opentelemetry::KeyValue::new("version", "v1.0.0"),
            opentelemetry::KeyValue::new("service", service_name),
        ],
    );

    Ok(())
}

#[tokio::main]
async fn main() {
    let _ = setup_opentelemetry();
    let app = Router::new()
        .route("/", routing::get(handler_root))
        .route("/chain", routing::get(handler_chain))
        .route("/version", routing::get(handler_version))
        .route("/health", routing::get(handler_health));

    info!(target: "otel_rust::main", "Booting up server");
    let port = env::var("EXPOSE_PORT").ok().unwrap_or("9999".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = net::TcpListener::bind(&addr)
        .await
        .expect(format!("Could not listen on port {}", port).as_str());
    axum::serve(listener, app)
        .await
        .expect("Failed to start http api");
}
