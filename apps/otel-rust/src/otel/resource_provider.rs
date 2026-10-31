// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use opentelemetry::KeyValue;
use opentelemetry_resource_detectors::{OsResourceDetector, ProcessResourceDetector};
use opentelemetry_sdk::{resource::ResourceDetector, Resource};
use opentelemetry_semantic_conventions::resource;

use crate::constants::VERSION;

/// Resource::builder() already runs the SDK, telemetry and OTEL_RESOURCE_ATTRIBUTES detectors.
pub fn create_resource(service_name: String) -> Resource {
    let detectors: Vec<Box<dyn ResourceDetector>> = vec![
        Box::new(OsResourceDetector),
        Box::new(ProcessResourceDetector),
    ];
    Resource::builder()
        .with_detectors(&detectors)
        .with_service_name(service_name)
        .with_attribute(KeyValue::new(resource::SERVICE_VERSION, VERSION))
        .build()
}
