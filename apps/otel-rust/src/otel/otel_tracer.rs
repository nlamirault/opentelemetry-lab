// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry::trace::TraceError;
use opentelemetry_otlp::{ExportConfig, Protocol, WithExportConfig};
use opentelemetry_sdk::Resource;

pub fn create_tracer(
    resource: Resource,
    endpoint: String,
    protocol: String,
) -> Result<opentelemetry_sdk::trace::TracerProvider, TraceError> {
    let export_config = ExportConfig {
        endpoint: endpoint.to_string(),
        timeout: Duration::from_secs(3),
        protocol: Protocol::Grpc,
    };

    let otlp_exporter: opentelemetry_otlp::SpanExporterBuilder = match protocol.as_str() {
        "grpc" => opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(export_config)
            .into(),
        "http" => opentelemetry_otlp::new_exporter()
            .http()
            .with_export_config(export_config)
            .into(),
        &_ => {
            return Err(TraceError::Other(
                "OpenTelemetry protocol is not supported".into(),
            ))
        }
    };

    opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(otlp_exporter)
        .with_batch_config(
            opentelemetry_sdk::trace::BatchConfigBuilder::default()
                .with_max_queue_size(2048)
                .with_max_export_batch_size(512)
                .with_scheduled_delay(Duration::from_millis(5000))
                .build(),
        )
        .with_trace_config(
            opentelemetry_sdk::trace::Config::default().with_resource(resource.clone()),
        )
        .install_batch(opentelemetry_sdk::runtime::Tokio)

    // opentelemetry_otlp::new_pipeline()
    //     .tracing()
    //     .with_batch_config(
    //         opentelemetry_sdk::trace::BatchConfigBuilder::default()
    //             .with_max_queue_size(2048)
    //             .with_max_export_batch_size(512)
    //             .with_scheduled_delay(Duration::from_millis(5000))
    //             .build(),
    //     )
    //     .with_trace_config(
    //         opentelemetry_sdk::trace::Config::default().with_resource(resource.clone()),
    //     )
    //     .with_exporter(
    //         opentelemetry_otlp::new_exporter()
    //             .tonic()
    //             .with_export_config(export_config),
    //     )
    //     .install_batch(opentelemetry_sdk::runtime::Tokio)
}
