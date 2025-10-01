// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry::{metrics::MeterProvider, KeyValue};
use opentelemetry_sdk::metrics::SdkMeterProvider;
use opentelemetry_semantic_conventions::resource::{self, SERVICE_NAME};
use std::env;

use crate::constants::METRIC_BUILD_INFO;

/// Initializes and records the build info metric with standard semantic conventions
/// for language, service, and version.
pub fn init_build_info(meter_provider: &SdkMeterProvider) {
    let meter = meter_provider.meter("otel-rust");
    let build_info = meter
        .u64_counter(METRIC_BUILD_INFO)
        .with_description("Build information for the OpenTelemetry lab application")
        .build();

    let service_name = env::var("OTEL_SERVICE_NAME").unwrap_or("otel-rust".to_string());
    build_info.add(
        1,
        &[
            KeyValue::new(resource::TELEMETRY_SDK_LANGUAGE, "rust"),
            KeyValue::new(resource::SERVICE_NAME, service_name),
            KeyValue::new(resource::SERVICE_VERSION, "v1.0.0"),
        ],
    );
}
