// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry_otlp::MetricExporter;
use opentelemetry_sdk::metrics::SdkMeterProvider;
use opentelemetry_sdk::Resource;

use super::debug_enabled;

/// The OTLP transport and endpoint come from the OTEL_EXPORTER_OTLP_* variables.
pub fn init_meter(resource: Resource) -> anyhow::Result<SdkMeterProvider> {
    let mut builder = SdkMeterProvider::builder()
        .with_periodic_exporter(MetricExporter::builder().build()?)
        .with_resource(resource);
    if debug_enabled() {
        builder = builder.with_periodic_exporter(opentelemetry_stdout::MetricExporter::default());
    }
    Ok(builder.build())
}
