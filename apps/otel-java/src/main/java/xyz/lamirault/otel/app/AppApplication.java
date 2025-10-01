// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.semconv.ServiceAttributes;
import io.opentelemetry.semconv.TelemetryAttributes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import xyz.lamirault.otel.app.telemetry.OpenTelemetryConfiguration;

@SpringBootApplication
public class AppApplication {

  private static final Logger logger = LoggerFactory.getLogger(
    AppApplication.class
  );
  private static final String METRIC_BUILD_INFO = "opentelemetry.lab.build.info";

  private final OpenTelemetryConfiguration openTelemetryConfiguration;

  public AppApplication(OpenTelemetryConfiguration openTelemetryConfiguration) {
    this.openTelemetryConfiguration = openTelemetryConfiguration;
  }

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
    OpenTelemetry openTelemetry =
      openTelemetryConfiguration.configureOpenTelemetry();

    // Create build info metric
    Meter meter = openTelemetry.meterBuilder("otel-java").build();
    LongCounter buildInfo = meter
      .counterBuilder(METRIC_BUILD_INFO)
      .build();
    buildInfo.add(
      1,
      Attributes.builder()
        .put(TelemetryAttributes.TELEMETRY_SDK_LANGUAGE, "java")
        .put(ServiceAttributes.SERVICE_NAME, serviceName())
        .put(ServiceAttributes.SERVICE_VERSION, "v1.0.0")
        .build()
    );

    return openTelemetry;
  }
}
