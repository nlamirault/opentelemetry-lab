// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { trace } from "@opentelemetry/api";
import type { Span, SpanContext } from "@opentelemetry/api";

export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

export function getActiveSpanContext(): SpanContext | undefined {
  return getActiveSpan()?.spanContext();
}
