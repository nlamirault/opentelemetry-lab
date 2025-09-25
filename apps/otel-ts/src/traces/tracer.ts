// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { trace } from "@opentelemetry/api";
import type { Tracer } from "@opentelemetry/api";

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";

export function getTracer(): Tracer {
  return trace.getTracer(serviceName, "1.0.0");
}
