// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");
const client = require("prom-client");

const logger = pino();
const router = express.Router();

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "otel-js",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

router.get("/metrics", async (req, res) => {
  logger.info("Prometheus metrics handler");
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

module.exports = router;