// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;

use anyhow::Context as _;
use axum::{routing, Router};
use axum_tracing_opentelemetry::middleware::OtelAxumLayer;
use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_sdk::logs::SdkLoggerProvider;
use opentelemetry_sdk::metrics::SdkMeterProvider;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::trace::SdkTracerProvider;
use tokio::{net, signal};
use tracing::{error, info};
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::prelude::*;
use tracing_subscriber::EnvFilter;

mod constants;
mod otel;
mod routes;

use otel::{create_resource, init_build_info, init_logger, init_meter, init_tracer};
use routes::{handler_chain, handler_health, handler_root, handler_version};

const EXPORTER_TARGETS: [&str; 5] = ["h2", "hyper", "opentelemetry", "reqwest", "tonic"];

struct Telemetry {
    tracer_provider: SdkTracerProvider,
    meter_provider: SdkMeterProvider,
    logger_provider: SdkLoggerProvider,
}

impl Telemetry {
    /// Flushes pending telemetry. The logger goes last so that earlier
    /// failures are still exported.
    fn shutdown(self) {
        if let Err(err) = self.tracer_provider.shutdown() {
            error!(target: "otel_rust::main", "failed to shut down tracer provider: {err}");
        }
        if let Err(err) = self.meter_provider.shutdown() {
            error!(target: "otel_rust::main", "failed to shut down meter provider: {err}");
        }
        if let Err(err) = self.logger_provider.shutdown() {
            eprintln!("failed to shut down logger provider: {err}");
        }
    }
}

/// Reads RUST_LOG, defaulting to info.
fn env_filter() -> EnvFilter {
    EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy()
}

/// Exporter internals must not feed their own telemetry back into the pipeline.
fn without_exporters(mut filter: EnvFilter) -> anyhow::Result<EnvFilter> {
    for target in EXPORTER_TARGETS {
        filter = filter.add_directive(format!("{target}=off").parse()?);
    }
    Ok(filter)
}

/// Spans ignore RUST_LOG: a disabled span has no context to propagate downstream.
/// axum-tracing-opentelemetry creates its server spans at TRACE level.
fn spans_filter() -> anyhow::Result<EnvFilter> {
    without_exporters(EnvFilter::new("info,otel::tracing=trace"))
}

fn setup_opentelemetry() -> anyhow::Result<Telemetry> {
    let service_name = env::var("OTEL_SERVICE_NAME").unwrap_or_else(|_| "otel-rust".to_string());

    let resource = create_resource(service_name.clone());
    let logger_provider = init_logger(resource.clone())?;
    let meter_provider = init_meter(resource.clone())?;
    let tracer_provider = init_tracer(resource)?;

    let tracer = tracer_provider.tracer(env!("CARGO_PKG_NAME"));
    tracing_subscriber::registry()
        .with(
            tracing_opentelemetry::layer()
                .with_tracer(tracer)
                .with_filter(spans_filter()?),
        )
        .with(
            OpenTelemetryTracingBridge::new(&logger_provider)
                .with_filter(without_exporters(env_filter())?),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_thread_names(true)
                .with_filter(env_filter()),
        )
        .try_init()?;

    global::set_text_map_propagator(TraceContextPropagator::new());
    global::set_tracer_provider(tracer_provider.clone());
    global::set_meter_provider(meter_provider.clone());

    // Initialize build info metric
    init_build_info(&meter_provider, &service_name);

    info!(target: "otel_rust::setup_opentelemetry", message = "Setup OpenTelemetry done");

    Ok(Telemetry {
        tracer_provider,
        meter_provider,
        logger_provider,
    })
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    info!(target: "otel_rust::main", "Shutting down");
}

async fn serve() -> anyhow::Result<()> {
    let app = Router::new()
        .route("/", routing::get(handler_root))
        .route("/chain", routing::get(handler_chain))
        .route("/version", routing::get(handler_version))
        .route("/health", routing::get(handler_health))
        .layer(OtelAxumLayer::default().filter(|path| path != "/health"));

    info!(target: "otel_rust::main", "Booting up server");
    let port = env::var("EXPOSE_PORT").unwrap_or_else(|_| "9999".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = net::TcpListener::bind(&addr)
        .await
        .with_context(|| format!("Could not listen on {addr}"))?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("Failed to start http api")
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let telemetry = setup_opentelemetry()?;
    let result = serve().await;
    telemetry.shutdown();
    result
}
