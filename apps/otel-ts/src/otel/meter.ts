// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { metrics } from "@opentelemetry/api";
import { METRIC_BUILD_INFO } from "./constants";

export function createBuildInfoMetric(serviceName: string) {
  const meter = metrics.getMeter("otel-ts");
  const buildInfo = meter.createCounter(METRIC_BUILD_INFO);
  buildInfo.add(1, {
    language: "typescript",
    version: "v1.0.0",
    service: serviceName,
  });
}
