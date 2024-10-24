// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry_appender_log::OpenTelemetryLogBridge;
use opentelemetry_otlp::{Protocol, WithExportConfig, ExportConfig};
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::logs::LoggerProvider;
use opentelemetry::logs::{LogError};


pub fn create_logger(
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
