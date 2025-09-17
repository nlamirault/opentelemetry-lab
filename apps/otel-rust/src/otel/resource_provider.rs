// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::env;

use opentelemetry::KeyValue;
use opentelemetry_resource_detectors::{OsResourceDetector, ProcessResourceDetector};
use opentelemetry_sdk::{
    resource::EnvResourceDetector,
    resource::ResourceDetector,
    resource::SdkProvidedResourceDetector,
    resource::TelemetryResourceDetector,
    // },
    Resource,
};
use opentelemetry_semantic_conventions::resource;

pub fn create_resource() -> Resource {
    let service_name =
        env::var("OTEL_SERVICE_NAME").unwrap_or_else(|_| "default-otel-rust".to_string());
    let detectors: Vec<Box<dyn ResourceDetector>> = vec![
        Box::new(EnvResourceDetector::new()),
        Box::new(OsResourceDetector),
        Box::new(ProcessResourceDetector),
        Box::new(SdkProvidedResourceDetector),
        Box::new(TelemetryResourceDetector),
    ];
    Resource::builder()
        .with_detectors(&detectors)
        .with_service_name(service_name)
        .with_attribute(KeyValue::new(
            resource::SERVICE_VERSION,
            env!("CARGO_PKG_VERSION"),
        ))
        .build()

    //     sdk_resource
    //         .merge(&env_resource)
    //         .merge(&telemetry_resource)
    //         .merge(&Resource::new(vec![
    //             KeyValue::new(resource::SERVICE_NAME, service_name),
    //             KeyValue::new(resource::SERVICE_VERSION, env!("CARGO_PKG_VERSION")),
    //         ]))
}
