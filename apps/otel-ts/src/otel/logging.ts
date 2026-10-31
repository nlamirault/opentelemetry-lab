// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { logs } from "@opentelemetry/api-logs";
import type { Logger } from "@opentelemetry/api-logs";

export function getLogger(): Logger {
  return logs.getLogger("otel-ts");
}
