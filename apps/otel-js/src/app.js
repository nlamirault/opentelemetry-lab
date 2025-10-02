// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const fastify = require("fastify");
const { FastifyOtelInstrumentation } = require("@fastify/otel");

const routes = require("./routes/index");
const otel = require("./telemetry/otel");
const { initBuildInfoMetric } = require("./telemetry/metrics");
const shared = require("./telemetry/shared");

async function initializeApp() {
  const app = fastify({ logger: false });
  const port = process.env.EXPOSE_PORT || 3000;
  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";

  // Register Fastify OpenTelemetry plugin
  const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
    servername: serviceName,
  });
  await app.register(fastifyOtelInstrumentation.plugin());

  // Register routes
  await app.register(routes);

  try {
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    
    console.log(`App is running at: http://localhost:${port}`);

    // Use OpenTelemetry logger
    const logger = shared.getLogger();
    logger.emit({
      severityText: "info",
      body: `Bootstrap the OpenTelemetry JavaScript application on port ${port}`,
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }

  return app;
}

async function bootstrap() {
  try {
    // Initialize OpenTelemetry first
    const { loggerProvider } = otel.setup_opentelemetry();

    // Set the logger provider for shared access
    shared.setLoggerProvider(loggerProvider);

    // Initialize build info metric after OpenTelemetry setup
    const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";
    initBuildInfoMetric(serviceName);

    // Initialize and start the app
    await initializeApp();
  } catch (error) {
    console.error("Failed to bootstrap application:", error);
    process.exit(1);
  }
}

bootstrap();
