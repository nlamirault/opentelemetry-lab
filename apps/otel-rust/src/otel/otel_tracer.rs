// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

// use std::time::Duration;

use opentelemetry_otlp::{Protocol, SpanExporter, WithExportConfig};
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_sdk::Resource;

pub fn init_tracer(resource: Resource, endpoint: String, protocol: String) -> SdkTracerProvider {
    let exporter: opentelemetry_otlp::SpanExporter = match protocol.as_str() {
        "grpc" => SpanExporter::builder()
            .with_tonic()
            // .with_export_config(ExportConfig {
            //     endpoint: endpoint.into(),
            //     timeout: Duration::from_secs(3).into(),
            //     protocol: Protocol::Grpc,
            // })
            .with_protocol(Protocol::Grpc)
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to initialize OTLP tracer exporter"),
        "http" => SpanExporter::builder()
            .with_http()
            // .with_export_config(ExportConfig {
            //     endpoint: endpoint.clone() + "/v1/traces",
            //     timeout: Duration::from_secs(3).into(),
            //     protocol: Protocol::HttpBinary,
            // })
            .with_protocol(Protocol::HttpBinary)
            .with_endpoint(endpoint.clone() + "/v1/traces")
            .build()
            .expect("Failed to initialize OTLP tracer exporter"),
        &_ => panic!("unsupported OTLP protocol: {}", protocol),
    };

    let provider: SdkTracerProvider = SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        .with_resource(resource)
        .build();

    provider
}
