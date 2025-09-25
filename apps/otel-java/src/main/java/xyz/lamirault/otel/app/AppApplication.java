// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app;

import io.opentelemetry.api.OpenTelemetry;
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
    return openTelemetryConfiguration.configureOpenTelemetry();
  }
}
