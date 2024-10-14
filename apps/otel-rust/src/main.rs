# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

use anyhow;
use std::env;
use std::time::Duration;

use axum::{
    // body::Body,
    routing,
    // response,
    Router,
};
use log;
use opentelemetry::KeyValue;
use opentelemetry::{global};
use opentelemetry_appender_log::OpenTelemetryLogBridge;
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::{propagation::TraceContextPropagator};
use opentelemetry_sdk::resource::{
	EnvResourceDetector, SdkProvidedResourceDetector, TelemetryResourceDetector,
};
use opentelemetry_sdk::logs::LoggerProvider;
use opentelemetry_sdk::metrics::reader::DefaultTemporalitySelector;
use opentelemetry::logs::{LogError};
use opentelemetry::metrics::{MetricsError};
use opentelemetry::trace::{Span, Tracer, TraceError, TracerProvider};
use opentelemetry_otlp::{Protocol, WithExportConfig, ExportConfig};
use opentelemetry_semantic_conventions::resource;
use serde_json::{Value, json};
use tokio::{net};
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{fmt, prelude::*, Registry};



fn init_logger(
    resource: &Resource,
    endpoint: String
) -> Result<opentelemetry_sdk::logs::LoggerProvider, LogError> {

    let log_stdout_exporter = opentelemetry_stdout::LogExporter::default();
    let logger_provider = LoggerProvider::builder()
        .with_resource(resource.clone())
        .with_simple_exporter(log_stdout_exporter)
        .build();

    // Setup Log Appender for the log crate.
    let otel_log_appender = OpenTelemetryLogBridge::new(&logger_provider);
    log::set_boxed_logger(Box::new(otel_log_appender)).unwrap();
    log::set_max_level(log::Level::Debug.to_level_filter());

    let export_config = ExportConfig {
            endpoint: endpoint.to_string(),
            timeout: Duration::from_secs(3),
            protocol: Protocol::Grpc
        };

    opentelemetry_otlp::new_pipeline()
        .logging()
        .with_batch_config(
            opentelemetry_sdk::logs::BatchConfigBuilder::default()
                .with_max_queue_size(30000)
                .with_max_export_batch_size(10000)
                .with_scheduled_delay(Duration::from_millis(5000))
                .build(),
        )
        .with_resource(resource.clone())
        .with_exporter(opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(export_config))
        .install_batch(opentelemetry_sdk::runtime::Tokio)
}

fn init_tracer(
    resource: &Resource,
    endpoint: String
) -> Result<opentelemetry_sdk::trace::TracerProvider, TraceError> {
    let export_config = ExportConfig {
        endpoint: endpoint.to_string(),
        timeout: Duration::from_secs(3),
        protocol: Protocol::Grpc
    };

    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_batch_config(
            opentelemetry_sdk::trace::BatchConfigBuilder::default()
                .with_max_queue_size(2048)
                .with_max_export_batch_size(512)
                .with_scheduled_delay(Duration::from_millis(5000))
                .build())
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default()
                .with_resource(resource.clone()))
        .with_exporter(opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(export_config))
        .install_batch(opentelemetry_sdk::runtime::Tokio)
}

fn init_meter_provider(
    resource: Resource,
    endpoint: String
) -> Result<opentelemetry_sdk::metrics::SdkMeterProvider, MetricsError> {
    let meter_export_config = ExportConfig {
        endpoint: endpoint,
        timeout: Duration::from_secs(3),
        protocol: Protocol::Grpc
    };

    opentelemetry_otlp::new_pipeline()
        .metrics(opentelemetry_sdk::runtime::Tokio)
        .with_exporter(opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(meter_export_config),
        )
        .with_resource(resource.clone())
        .with_period(Duration::from_secs(3))
        .with_timeout(Duration::from_secs(10))
        .with_temporality_selector(DefaultTemporalitySelector::new())
        .build()
}

fn opentelemetry(service_name: &'static str) -> anyhow::Result<()> {
    
    let default_endpoint = "http://localhost:4317".to_string();
    let endpoint = env::var("OTEL_EXPORTER_OTLP_ENDPOINT").unwrap_or(default_endpoint);

    let resource = Resource::from_detectors(
        Duration::from_secs(0),
        vec![
            Box::new(SdkProvidedResourceDetector),
            Box::new(EnvResourceDetector::new()),
            Box::new(TelemetryResourceDetector),
        ],
    );
    resource.merge(&Resource::new(vec![
        KeyValue::new(resource::SERVICE_NAME, service_name),
        KeyValue::new(resource::SERVICE_VERSION, env!("CARGO_PKG_VERSION"))
    ]));

    // Logging

    let logger_provider = init_logger(&resource, endpoint.clone()).expect("failed to initialize logger");

    // Tracing

    let tracer_provider = init_tracer(&resource, endpoint.clone()).expect("failed to initialize tracer");
    global::set_text_map_propagator(TraceContextPropagator::new());
    global::set_tracer_provider(tracer_provider.clone());

    let tracer = tracer_provider.tracer("ttembed");
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

    let subscriber = Registry::default()
        .with(telemetry.with_filter(LevelFilter::INFO))
        .with(OpenTelemetryTracingBridge::new(&logger_provider).with_filter(LevelFilter::INFO))
        .with(fmt::Layer::default().with_filter(LevelFilter::DEBUG));

    tracing::subscriber::set_global_default(subscriber).unwrap();
    
    // Metrics

    let meter_provider = init_meter_provider(resource, endpoint.clone()).expect("failed to initialize meter");
    global::set_meter_provider(meter_provider.clone());



    Ok(())
}

async fn handler_health() -> axum::Json<Value> {
    log::info!("Health handler");
    axum::Json(json!({ "status": "ok" }))
}

async fn handler_root() -> axum::Json<Value> { // &'static str {
    log::info!("Root handler");
    let tracer = global::tracer("otel-rust");
    let mut span = tracer.start("root_handler");
    span.set_attribute(KeyValue::new("path", "/".to_string()));
    axum::Json(json!({ "app": "OpenTelemetry with Rust" }))
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
