from opentelemetry import trace
from opentelemetry.semconv.trace import SpanAttributes


def set_span_error(span, error_type, message, stacktrace):
    span.set_attribute(SpanAttributes.EXCEPTION_TYPE, error_type)
    span.set_attribute(SpanAttributes.EXCEPTION_MESSAGE, message)
    span.set_attribute(SpanAttributes.EXCEPTION_STACKTRACE, stacktrace)
    span.set_status(trace.Status(trace.StatusCode.ERROR))
