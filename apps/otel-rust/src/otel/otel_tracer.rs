use std::time::Duration;

use opentelemetry_otlp::{ExportConfig, Protocol, SpanExporter, WithExportConfig};
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_sdk::Resource;

pub fn init_tracer(resource: Resource, endpoint: String, protocol: String) -> SdkTracerProvider {
    let exporter: opentelemetry_otlp::SpanExporter = match protocol.as_str() {
        "grpc" => SpanExporter::builder()
            .with_tonic()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string().into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::Grpc,
            })
            .build()
            .expect("Failed to initialize logger provider"),
        "http" => SpanExporter::builder()
            .with_http()
            .with_export_config(ExportConfig {
                endpoint: endpoint.to_string().into(),
                timeout: Duration::from_secs(3).into(),
                protocol: Protocol::HttpBinary,
            })
            .build()
            .expect("Failed to initialize logger provider"),
        &_ => panic!("unsupported OTLP protocol: {}", protocol),
    };

    let provider: SdkTracerProvider = SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        // .with_simple_exporter(log_stdout_exporter)
        .with_resource(resource)
        .build();

    provider
}
