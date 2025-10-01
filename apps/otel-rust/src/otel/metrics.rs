// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry::{metrics::MeterProvider, KeyValue};
use opentelemetry_sdk::metrics::SdkMeterProvider;
use opentelemetry_semantic_conventions::resource;

use crate::constants::METRIC_BUILD_INFO;

/// Initializes and records the build info metric with standard semantic conventions
/// for language, service, and version.
pub fn init_build_info(meter_provider: &SdkMeterProvider, service_name: String) {
    let meter = meter_provider.meter(Box::leak(service_name.clone().into_boxed_str()));
    let build_info = meter
        .u64_counter(METRIC_BUILD_INFO)
        .with_description("Build information for the OpenTelemetry lab application")
        .build();

    build_info.add(
        1,
        &[
            KeyValue::new(resource::TELEMETRY_SDK_LANGUAGE, "rust"),
            KeyValue::new(resource::SERVICE_NAME, service_name.clone()),
            KeyValue::new(resource::SERVICE_VERSION, "v1.0.0"),
        ],
    );
}
