// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

pub const METRIC_BUILD_INFO: &str = "opentelemetry.lab.build.info";

/// Application version, derived from Cargo.toml.
pub const VERSION: &str = concat!("v", env!("CARGO_PKG_VERSION"));
