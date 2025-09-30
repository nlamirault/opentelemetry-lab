// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");
const client = require("prom-client");
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_TELEMETRY_SDK_LANGUAGE,
} = require("@opentelemetry/semantic-conventions");

const logger = pino();
const router = express.Router();

// --- sanitize OTEL attribute names -> prometheus-safe label names
const promLabel = (otelAttr) => otelAttr.replace(/\./g, "_"); // "service.name" -> "service_name"

// Create a Registry to register the metrics
const register = new client.Registry();

const PROM_SERVICE_LABEL = promLabel(ATTR_SERVICE_NAME);
const PROM_VERSION_LABEL = promLabel(ATTR_SERVICE_VERSION);
const PROM_SDK_LABEL = promLabel(ATTR_TELEMETRY_SDK_LANGUAGE);

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "otel-js",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";

// Create build info metric for Prometheus
const buildInfoMetric = new client.Gauge({
  name: "opentelemetry_lab_build_info",
  help: "Build information for the OpenTelemetry lab application",
  labelNames: [PROM_SERVICE_LABEL, PROM_VERSION_LABEL, PROM_SDK_LABEL],
  registers: [register],
});

// Set the build info metric
buildInfoMetric.set(
  {
    [PROM_SERVICE_LABEL]: serviceName,
    [PROM_VERSION_LABEL]: "v1.0.0",
    [PROM_SDK_LABEL]: "nodejs",
  },
  1,
);

router.get("/metrics", async (req, res) => {
  logger.info("Prometheus metrics handler");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

module.exports = router;