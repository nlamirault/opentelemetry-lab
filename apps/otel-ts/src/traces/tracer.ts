import { trace } from "@opentelemetry/api";
import type { Tracer } from "@opentelemetry/api";

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";

export function getTracer(): Tracer {
  return trace.getTracer(serviceName, "1.0.0");
}
