// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.telemetry;

import io.opentelemetry.exporter.otlp.http.metrics.OtlpHttpMetricExporter;
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.MetricExporter;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.sdk.resources.Resource;
import java.time.Duration;

public final class MetricsConfiguration {

  private MetricsConfiguration() {}

  private static MetricExporter createMetricExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpMetricExporter.builder()
        .setEndpoint(String.format("%s/v1/metrics", endpoint))
        .build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcMetricExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  public static SdkMeterProvider createMeterProvider(
    Resource resource,
    String otlpEndpoint,
    String otlpProtocol
  ) {
    MetricExporter otlpMetricExporter = createMetricExporter(
      otlpEndpoint,
      otlpProtocol
    );
    PeriodicMetricReader otlpReader = PeriodicMetricReader.builder(
      otlpMetricExporter
    ).build();
    SdkMeterProvider sdkMeterProvider = SdkMeterProvider.builder()
      .setResource(resource)
      .registerMetricReader(otlpReader)
      .build();
    return sdkMeterProvider;
  }
}
