# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

METRIC_BUILD_INFO = "opentelemetry.lab.build.info"

# Probe and scrape endpoints: neither traced nor written to the access log.
UNTRACED_PATHS = ("/health", "/metrics")

# Time given to flush the telemetry on shutdown, below the 10s grace period of
# `docker stop` and of Kubernetes (30s).
SHUTDOWN_TIMEOUT_SECONDS = 5
