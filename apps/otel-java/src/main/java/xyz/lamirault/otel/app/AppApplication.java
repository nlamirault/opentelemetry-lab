// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.baggage.propagation.W3CBaggagePropagator;
import io.opentelemetry.api.logs.GlobalLoggerProvider;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.ContextPropagators;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.exporter.logging.LoggingSpanExporter;
// import io.opentelemetry.exporter.logging.LoggingMetricExporter;
// import io.opentelemetry.exporter.logging.LoggingSpanExporter;
import io.opentelemetry.exporter.logging.SystemOutLogRecordExporter;
import io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter;
import io.opentelemetry.exporter.otlp.http.metrics.OtlpHttpMetricExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.logs.OtlpGrpcLogRecordExporter;
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.logs.export.LogRecordExporter;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.MetricExporter;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import io.opentelemetry.semconv.ServiceAttributes;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class AppApplication {

  private static final Logger logger = LoggerFactory.getLogger(
    AppApplication.class
  );

  private static final String OTLP_DEFAULT_EXPORTER = "http://localhost:4317";

  public static void main(String[] args) {
    logger.info("Bootstrap application");
    SpringApplication.run(AppApplication.class, args);
  }

  @Bean
  public String serviceName() {
    return System.getenv().getOrDefault("OTEL_SERVICE_NAME", "otel-java");
  }

  @Bean
  public OpenTelemetry openTelemetry() {
    String otlpEndpoint = System.getenv()
      .getOrDefault("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_DEFAULT_EXPORTER);
    String otlpProtocol = System.getenv("OTEL_EXPORTER_OTLP_PROTOCOL");

    Resource resource = createResource();
    SdkLoggerProvider sdkLoggerProvider = createLoggerProvider(
      resource,
      otlpEndpoint,
      otlpProtocol
    );
    SdkTracerProvider sdkTracerProvider = createTracerProvider(
      resource,
      otlpEndpoint,
      otlpProtocol
    );
    SdkMeterProvider sdkMeterProvider = createMeterProvider(
      resource,
      otlpEndpoint,
      otlpProtocol
    );
    OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
      .setTracerProvider(sdkTracerProvider)
      .setLoggerProvider(sdkLoggerProvider)
      .setMeterProvider(sdkMeterProvider)
      .setPropagators(
        ContextPropagators.create(
          TextMapPropagator.composite(
            W3CTraceContextPropagator.getInstance(),
            W3CBaggagePropagator.getInstance()
          )
        )
      )
      .build();

    GlobalOpenTelemetry.set(sdk);
    GlobalLoggerProvider.set(sdk.getSdkLoggerProvider());
    // Add hook to close SDK, which flushes logs
    Runtime.getRuntime().addShutdownHook(new Thread(sdk::close));

    return sdk;
  }

  private static Resource createResource() {
    String serviceName = System.getenv()
      .getOrDefault("OTEL_SERVICE_NAME", "otel-java");

    Resource resource = Resource.getDefault()
      .toBuilder()
      .put(ServiceAttributes.SERVICE_NAME, serviceName)
      .put(ServiceAttributes.SERVICE_VERSION, "1.0.0")
      .build();
    return resource;
  }

  private static LogRecordExporter createLogRecordExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpLogRecordExporter.builder().setEndpoint(endpoint).build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcLogRecordExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  private static SdkLoggerProvider createLoggerProvider(
    Resource resource,
    String otlpEndpoint,
    String otlpProtocol
  ) {
    LogRecordExporter otlpLogExporter = createLogRecordExporter(
      otlpEndpoint,
      otlpProtocol
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

  private static SpanExporter createSpanExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpSpanExporter.builder().setEndpoint(endpoint).build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcSpanExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  private static SdkTracerProvider createTracerProvider(
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
      .addSpanProcessor(
        SimpleSpanProcessor.create(LoggingSpanExporter.create())
      )
      .addSpanProcessor(otlpProcessor)
      .setResource(resource)
      .build();
    return sdkTracerProvider;
  }

  private static MetricExporter createMetricExporter(
    String endpoint,
    String protocol
  ) {
    if ("http".equals(protocol)) {
      return OtlpHttpMetricExporter.builder().setEndpoint(endpoint).build();
    } else if ("grpc".equals(protocol)) {
      return OtlpGrpcMetricExporter.builder()
        .setEndpoint(endpoint)
        .setTimeout(Duration.ofSeconds(10))
        .build();
    }
    throw new IllegalStateException("Unsupported OTLP protocol: " + protocol);
  }

  private static SdkMeterProvider createMeterProvider(
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
