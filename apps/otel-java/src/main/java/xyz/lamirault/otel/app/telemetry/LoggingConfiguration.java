// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.telemetry;

import io.opentelemetry.exporter.logging.SystemOutLogRecordExporter;
import io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter;
import io.opentelemetry.exporter.otlp.logs.OtlpGrpcLogRecordExporter;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.logs.export.LogRecordExporter;
import io.opentelemetry.sdk.resources.Resource;
import java.time.Duration;

public final class LoggingConfiguration {

  // private LoggingConfiguration() {}

  private static LogRecordExporter createLogRecordExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpLogRecordExporter.builder()
        .setEndpoint(String.format("%s/v1/logs", endpoint))
        .build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcLogRecordExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  public static SdkLoggerProvider createLoggerProvider(
    Resource resource,
    String endpoint,
    String protocol
  ) {
    LogRecordExporter otlpLogExporter = createLogRecordExporter(
      endpoint,
      protocol
    );
    BatchLogRecordProcessor otlpLogProcessor = BatchLogRecordProcessor.builder(
      otlpLogExporter
    ).build();
    BatchLogRecordProcessor consoleLogProcessor =
      BatchLogRecordProcessor.builder(
        SystemOutLogRecordExporter.create()
      ).build();
    SdkLoggerProvider sdkLoggerProvider = SdkLoggerProvider.builder()
      .setResource(resource)
      .addLogRecordProcessor(otlpLogProcessor)
      .addLogRecordProcessor(consoleLogProcessor)
      .build();
    return sdkLoggerProvider;
  }
}
