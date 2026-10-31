// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

use std::env;

mod resource_provider;
pub use resource_provider::create_resource;

mod otel_logger;
pub use otel_logger::init_logger;

mod otel_meter;
pub use otel_meter::init_meter;

mod otel_tracer;
pub use otel_tracer::init_tracer;

mod metrics;
pub use metrics::init_build_info;

/// A non-empty OTEL_DEBUG adds stdout exporters next to the OTLP ones.
fn debug_enabled() -> bool {
    env::var_os("OTEL_DEBUG").is_some_and(|value| !value.is_empty())
}
