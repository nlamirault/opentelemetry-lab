// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.telemetry;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.baggage.propagation.W3CBaggagePropagator;
// import io.opentelemetry.api.logs.GlobalLoggerProvider;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.ContextPropagators;
import io.opentelemetry.context.propagation.TextMapPropagator;
import io.opentelemetry.instrumentation.log4j.appender.v2_17.OpenTelemetryAppender;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.logs.SdkLoggerProvider;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import org.springframework.stereotype.Component;

@Component
public class OpenTelemetryConfiguration {

  // private static final Logger logger = LoggerFactory.getLogger(
  //   OpenTelemetryConfiguration.class
  // );

  private static final String OTLP_DEFAULT_EXPORTER = "http://127.0.0.1:4317";

  public OpenTelemetry configureOpenTelemetry() {
    String otlpEndpoint = System.getenv().getOrDefault(
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      OTLP_DEFAULT_EXPORTER
    );
    String otlpProtocol = System.getenv("OTEL_EXPORTER_OTLP_PROTOCOL");
    String serviceName = System.getenv().getOrDefault(
      "OTEL_SERVICE_NAME",
      "otel-java"
    );

    Resource resource = ResourceConfiguration.createResource(serviceName);
    SdkLoggerProvider loggerProvider =
      LoggingConfiguration.createLoggerProvider(
        resource,
        otlpEndpoint,
        otlpProtocol
      );
    SdkTracerProvider tracerProvider =
      TracingConfiguration.createTracerProvider(
        resource,
        otlpEndpoint,
        otlpProtocol
      );
    SdkMeterProvider meterProvider = MetricsConfiguration.createMeterProvider(
      resource,
      otlpEndpoint,
      otlpProtocol
    );

    OpenTelemetrySdk sdk = OpenTelemetrySdk.builder()
      .setTracerProvider(tracerProvider)
      .setMeterProvider(meterProvider)
      .setLoggerProvider(loggerProvider)
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
    OpenTelemetryAppender.install(sdk);
    Runtime.getRuntime().addShutdownHook(new Thread(sdk::close));

    return sdk;
  }
}
