// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

use std::time::Duration;

use opentelemetry::KeyValue;
use opentelemetry_sdk::{
    resource::{
        EnvResourceDetector,
        ResourceDetector,
        SdkProvidedResourceDetector,
        TelemetryResourceDetector,
    },
    Resource,
};
use opentelemetry_semantic_conventions::resource;

pub fn create_resource(service_name: &'static str) -> Resource {
    let sdk_resource = SdkProvidedResourceDetector.detect(Duration::from_secs(0));
    let env_resource = EnvResourceDetector::new().detect(Duration::from_secs(0));
    let telemetry_resource = TelemetryResourceDetector.detect(Duration::from_secs(0));

    sdk_resource
        .merge(&env_resource)
        .merge(&telemetry_resource)
        .merge(&Resource::new(vec![
            KeyValue::new(resource::SERVICE_NAME, service_name),
            KeyValue::new(resource::SERVICE_VERSION, env!("CARGO_PKG_VERSION"))
        ]))
}
