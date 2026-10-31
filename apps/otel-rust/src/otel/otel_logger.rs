// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry_otlp::LogExporter;
use opentelemetry_sdk::logs::SdkLoggerProvider;
use opentelemetry_sdk::Resource;

use super::debug_enabled;

/// The OTLP transport and endpoint come from the OTEL_EXPORTER_OTLP_* variables.
pub fn init_logger(resource: Resource) -> anyhow::Result<SdkLoggerProvider> {
    let mut builder = SdkLoggerProvider::builder()
        .with_batch_exporter(LogExporter::builder().build()?)
        .with_resource(resource);
    if debug_enabled() {
        builder = builder.with_simple_exporter(opentelemetry_stdout::LogExporter::default());
    }
    Ok(builder.build())
}
