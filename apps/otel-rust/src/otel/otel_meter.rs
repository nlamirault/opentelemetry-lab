// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry_sdk::Resource;
use opentelemetry_sdk::metrics::reader::DefaultTemporalitySelector;
use opentelemetry::metrics::{MetricsError};
use opentelemetry_otlp::{Protocol, WithExportConfig, ExportConfig};


pub fn create_meter(
    resource: Resource,
    endpoint: String
) -> Result<opentelemetry_sdk::metrics::SdkMeterProvider, MetricsError> {
    let meter_export_config = ExportConfig {
        endpoint: endpoint,
        timeout: Duration::from_secs(3),
        protocol: Protocol::Grpc
    };

    opentelemetry_otlp::new_pipeline()
        .metrics(opentelemetry_sdk::runtime::Tokio)
        .with_exporter(opentelemetry_otlp::new_exporter()
            .tonic()
            .with_export_config(meter_export_config),
        )
        .with_resource(resource.clone())
        .with_period(Duration::from_secs(3))
        .with_timeout(Duration::from_secs(10))
        .with_temporality_selector(DefaultTemporalitySelector::new())
        .build()
}
