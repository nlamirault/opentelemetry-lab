// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.logs.GlobalLoggerProvider;
// import io.opentelemetry.api.baggage.propagation.W3CBaggagePropagator;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.ContextPropagators;
import io.opentelemetry.context.propagation.TextMapPropagator;
// import io.opentelemetry.exporter.logging.LoggingMetricExporter;
// import io.opentelemetry.exporter.logging.LoggingSpanExporter;
import io.opentelemetry.exporter.logging.SystemOutLogRecordExporter;
import io.opentelemetry.exporter.otlp.logs.OtlpGrpcLogRecordExporter;
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import io.opentelemetry.sdk.logs.export.BatchLogRecordProcessor;
import io.opentelemetry.sdk.logs.export.LogRecordExporter;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.samplers.Sampler;
// import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.semconv.ResourceAttributes;
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

  public static void main(String[] args) {
    logger.info("Bootstrap application");
    SpringApplication.run(AppApplication.class, args);
  }

  @Bean
  public String serviceName() {
    String serviceName = System.getenv("OTEL_SERVICE_NAME");
    return serviceName != null ? serviceName : "otel-demo";
  }

  @Bean
  public OpenTelemetry openTelemetry() {
    String serviceName = System.getenv("OTEL_SERVICE_NAME");
    String otlpExporter = System.getenv("OTEL_EXPORTER_OTLP_ENDPOINT");

    Resource resource = Resource.getDefault()
      .toBuilder()
      .put(ResourceAttributes.SERVICE_NAME, serviceName)
      .put(ResourceAttributes.SERVICE_VERSION, "1.0.0")
      .build();

    // LogRecordExporter exporter = OtlpGrpcLogRecordExporter.builder().setEndpoint(otlpExporter).build();
    // BatchLogRecordProcessor processor = BatchLogRecordProcessor.builder(
    //     OtlpGrpcLogRecordExporter.builder().setEndpoint(otlpExporter).build()
    // ).build();

    // init OTel logger provider
    SdkLoggerProvider sdkLoggerProvider = SdkLoggerProvider.builder()
      .setResource(resource)
      .addLogRecordProcessor(
        BatchLogRecordProcessor.builder(
          OtlpGrpcLogRecordExporter.builder().setEndpoint(otlpExporter).build()
        ).build()
      )
      .addLogRecordProcessor(
        BatchLogRecordProcessor.builder(
          SystemOutLogRecordExporter.create()
        ).build()
      )
      .build();

    // init OTel trace provider
    SdkTracerProvider sdkTracerProvider = SdkTracerProvider.builder()
      .setResource(resource)
      .setSampler(Sampler.alwaysOn())
      .addSpanProcessor(
        BatchSpanProcessor.builder(
          OtlpGrpcSpanExporter.builder().setEndpoint(otlpExporter).build()
        ).build()
      )
      .build();

    // init OTel meter provider
    SdkMeterProvider sdkMeterProvider = SdkMeterProvider.builder()
      .setResource(resource)
      .registerMetricReader(
        PeriodicMetricReader.builder(
          OtlpGrpcMetricExporter.builder().setEndpoint(otlpExporter).build()
        ).build()
      )
      .build();

    // create sdk object and set it as global
    OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
      .setTracerProvider(sdkTracerProvider)
      // .setLoggerProvider(sdkLoggerProvider)
      .setMeterProvider(sdkMeterProvider)
      .setPropagators(
        ContextPropagators.create(W3CTraceContextPropagator.getInstance())
      )
      .build();

    GlobalOpenTelemetry.set(sdk);
    // connect logger
    GlobalLoggerProvider.set(sdk.getSdkLoggerProvider());
    // Add hook to close SDK, which flushes logs
    Runtime.getRuntime().addShutdownHook(new Thread(sdk::close));

    return sdk;
  }
}
