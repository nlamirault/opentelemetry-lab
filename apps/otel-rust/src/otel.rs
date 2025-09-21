// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

mod resource_provider;
pub use resource_provider::create_resource;

mod otel_logger;
pub use otel_logger::init_logger;

mod otel_meter;
pub use otel_meter::init_meter;

mod otel_tracer;
pub use otel_tracer::init_tracer;
