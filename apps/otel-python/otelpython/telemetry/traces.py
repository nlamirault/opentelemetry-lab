# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from opentelemetry import trace
from opentelemetry.semconv.trace import SpanAttributes


def set_span_error(span: trace.Span, error_type: str, message: str, stacktrace: str) -> None:
    span.set_attribute(SpanAttributes.EXCEPTION_TYPE, error_type)
    span.set_attribute(SpanAttributes.EXCEPTION_MESSAGE, message)
    span.set_attribute(SpanAttributes.EXCEPTION_STACKTRACE, stacktrace)
    span.set_status(trace.Status(trace.StatusCode.ERROR))
