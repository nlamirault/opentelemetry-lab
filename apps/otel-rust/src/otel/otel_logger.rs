// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry_otlp::{ExportConfig, LogExporter, Protocol, WithExportConfig};
use opentelemetry_sdk::logs::SdkLoggerProvider;
use opentelemetry_sdk::Resource;

pub fn init_logger(resource: Resource, endpoint: String, protocol: String) -> SdkLoggerProvider {
    let stdout_exporter = opentelemetry_stdout::LogExporter::default();

    let otlp_exporter: opentelemetry_otlp::LogExporter = match protocol.as_str() {
        "grpc" => LogExporter::builder()
            .with_tonic()
            .with_export_config(ExportConfig {
                endpoint: endpoint.into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::Grpc,
            })
            .build()
            .expect("Failed to initialize OTLP logger exporter"),
        "http" => LogExporter::builder()
            .with_http()
            .with_export_config(ExportConfig {
                endpoint: endpoint.into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::HttpBinary,
            })
            .build()
            .expect("Failed to initialize OTLP logger exporter"),
        &_ => panic!("unsupported OTLP protocol: {}", protocol),
    };

    let provider: SdkLoggerProvider = SdkLoggerProvider::builder()
        .with_batch_exporter(otlp_exporter)
        .with_simple_exporter(stdout_exporter)
        .with_resource(resource)
        .build();

    // Note: Log bridge setup moved to main.rs to avoid conflicts with tracing subscriber

    provider
}
