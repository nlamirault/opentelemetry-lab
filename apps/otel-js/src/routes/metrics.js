// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const client = require("prom-client");
const { getLogger } = require("../telemetry/shared");

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "otel-js",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

async function metricsRoutes(fastify) {
  fastify.get("/metrics", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "info",
      body: "Prometheus metrics handler",
    });
    reply.header("Content-Type", register.contentType);
    return reply.send(await register.metrics());
  });
}

module.exports = metricsRoutes;
