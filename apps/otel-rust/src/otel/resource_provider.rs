// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;

use opentelemetry::KeyValue;
use opentelemetry_resource_detectors::{OsResourceDetector, ProcessResourceDetector};
use opentelemetry_sdk::{
    resource::EnvResourceDetector, resource::ResourceDetector,
    resource::SdkProvidedResourceDetector, resource::TelemetryResourceDetector, Resource,
};
use opentelemetry_semantic_conventions::resource;

pub fn create_resource(service_name: String) -> Resource {
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
}
