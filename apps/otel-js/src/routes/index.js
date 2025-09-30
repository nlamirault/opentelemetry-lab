// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const axios = require("axios");
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

const port = process.env.EXPOSE_PORT || 3000;
const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

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

router.get("/", (req, res) => {
  logger.info("Root handler");
  res.send("OpenTelemetry Lab / Javascript");
});

router.get("/health", (req, res) => {
  logger.info("Health handler");
  res.json({ version: "v1.0.0" });
});

router.get("/version", (req, res) => {
  logger.info("Version handler");
  res.json({ version: "v1.0.0" });
});

router.get("/error_test", (req, res) => {
  logger.error("got error!!!!");
  throw new Error("value error");
});

router.get("/chain", async (req, res) => {
  logger.info("Chain Start");
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_TWO_SVC}/`);
  logger.info("Chain Finished");
  res.json({ path: "/chain" });
});

router.get("/metrics", async (req, res) => {
  logger.info("Prometheus metrics handler");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

module.exports = router;
