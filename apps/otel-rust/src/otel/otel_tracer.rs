// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry_otlp::SpanExporter;
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_sdk::Resource;

use super::debug_enabled;

/// The OTLP transport and endpoint come from the OTEL_EXPORTER_OTLP_* variables.
pub fn init_tracer(resource: Resource) -> anyhow::Result<SdkTracerProvider> {
    let mut builder = SdkTracerProvider::builder()
        .with_batch_exporter(SpanExporter::builder().build()?)
        .with_resource(resource);
    if debug_enabled() {
        builder = builder.with_simple_exporter(opentelemetry_stdout::SpanExporter::default());
    }
    Ok(builder.build())
}
