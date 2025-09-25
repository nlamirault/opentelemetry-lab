// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.telemetry;

// import io.opentelemetry.exporter.logging.LoggingSpanExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.time.Duration;

public final class TracingConfiguration {

  private TracingConfiguration() {}

  private static SpanExporter createSpanExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpSpanExporter.builder()
        .setEndpoint(String.format("%s/v1/traces", endpoint))
        .build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcSpanExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  public static SdkTracerProvider createTracerProvider(
    Resource resource,
    String otlpEndpoint,
    String otlpProtocol
  ) {
    SpanExporter otlpSpanExporter = createSpanExporter(
      otlpEndpoint,
      otlpProtocol
    );
    BatchSpanProcessor otlpProcessor = BatchSpanProcessor.builder(
      otlpSpanExporter
    ).build();
    SdkTracerProvider sdkTracerProvider = SdkTracerProvider.builder()
      // .addSpanProcessor(
      //   SimpleSpanProcessor.create(LoggingSpanExporter.create())
      // )
      .addSpanProcessor(otlpProcessor)
      .setResource(resource)
      .build();
    return sdkTracerProvider;
  }
}
