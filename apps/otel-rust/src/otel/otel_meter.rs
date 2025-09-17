// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry_otlp::{ExportConfig, MetricExporter, Protocol, WithExportConfig};
use opentelemetry_sdk::metrics::{PeriodicReader, SdkMeterProvider};
use opentelemetry_sdk::Resource;

pub fn init_meter(resource: Resource, endpoint: String, protocol: String) -> SdkMeterProvider {
    let exporter: opentelemetry_otlp::MetricExporter = match protocol.as_str() {
        "grpc" => MetricExporter::builder()
            .with_tonic()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string().into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::Grpc,
            })
            .build()
            .expect("Failed to initialize OTLP meter exporter"),
        "http" => MetricExporter::builder()
            .with_http()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string().into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::HttpBinary,
            })
            .build()
            .expect("Failed to initialize OTLP meter exporter"),
        &_ => panic!("unsupported OTLP protocol: {}", protocol),
    };

    let reader = PeriodicReader::builder(exporter).build();

    let provider: SdkMeterProvider = SdkMeterProvider::builder()
        .with_reader(reader)
        .with_resource(resource)
        .build();

    provider
}
