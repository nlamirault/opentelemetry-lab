// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry::metrics::MetricsError;
use opentelemetry_otlp::{ExportConfig, Protocol, WithExportConfig};
use opentelemetry_sdk::metrics::reader::DefaultTemporalitySelector;
use opentelemetry_sdk::Resource;

pub fn create_meter(
    resource: Resource,
    endpoint: String,
    protocol: String,
) -> Result<opentelemetry_sdk::metrics::SdkMeterProvider, MetricsError> {
    let otlp_exporter: opentelemetry_otlp::MetricsExporterBuilder = match protocol.as_str() {
        "grpc" => opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string(),
                timeout: Duration::from_secs(3),
                protocol: Protocol::Grpc,
            })
            .into(),
        "http" => opentelemetry_otlp::new_exporter()
            .http()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string(),
                timeout: Duration::from_secs(3),
                protocol: Protocol::HttpBinary,
            })
            .into(),
        &_ => {
            return Err(MetricsError::Other(
                "OpenTelemetry protocol is not supported".into(),
            ))
        }
    };

    opentelemetry_otlp::new_pipeline()
        .metrics(opentelemetry_sdk::runtime::Tokio)
        .with_exporter(otlp_exporter)
        .with_resource(resource.clone())
        .with_period(Duration::from_secs(3))
        .with_timeout(Duration::from_secs(10))
        .with_temporality_selector(DefaultTemporalitySelector::new())
        .build()
}
