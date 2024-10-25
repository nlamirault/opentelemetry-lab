// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry::KeyValue;
use opentelemetry_sdk::{
    resource::{
        EnvResourceDetector, ResourceDetector, SdkProvidedResourceDetector,
        TelemetryResourceDetector,
    },
    Resource,
};
use opentelemetry_semantic_conventions::resource;

pub fn create_grpc_export_config(service_name: &'static str) -> ExportConfig {
    ExportConfig {
        endpoint: endpoint,
        timeout: Duration::from_secs(3),
        protocol: Protocol::Grpc,
    }
}

pub fn create_http_export_config(service_name: &'static str) -> ExportConfig {
    ExportConfig {
        endpoint: endpoint,
        timeout: Duration::from_secs(3),
        protocol: Protocol::HttpBinary,
    }
}
