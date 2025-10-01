// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Fastify, { FastifyInstance } from "fastify";
import { FastifyOtelInstrumentation } from "@fastify/otel";

import { logger } from "../logger";
import { registerRoutes } from "../routes";
import { getLogger } from "../otel/logging";

export async function initializeApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  // Register Fastify OpenTelemetry plugin
  const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
    servername: "otel-ts",
  });
  await fastify.register(fastifyOtelInstrumentation.plugin());

  await registerRoutes(fastify);

  const port = process.env.EXPOSE_PORT || 6666;
  try {
    await fastify.listen({ port: Number(port), host: "0.0.0.0" });

    // Use both loggers for now - traditional logger and OpenTelemetry logger
    logger.info(`App is running at: http://localhost:${port}`);

    const otelLogger = getLogger();
    otelLogger.emit({
      severityText: "info",
      body: `Bootstrap the OpenTelemetry TypeScript application on port ${port}`,
    });
  } catch (err) {
    logger.error(err);
  }

  return fastify;
}
