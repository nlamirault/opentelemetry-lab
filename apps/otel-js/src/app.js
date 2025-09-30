// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");
const { metrics } = require("@opentelemetry/api");

const routes = require("./routes/index");
const otel = require("./telemetry/otel");

const logger = pino();
const app = express();
const port = process.env.EXPOSE_PORT || 3000;

otel.setup_opentelemetry();

// Create build info metric
const meter = metrics.getMeter("otel-js");
const buildInfo = meter.createCounter("opentelemetry_lab_build_info");
buildInfo.add(1, {
  language: "javascript",
  version: "v1.0.0",
  service: process.env.OTEL_SERVICE_NAME || "otel-js"
});

logger.info("Bootstrap the OpenTelemetry application");

app.use("/", routes);
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  // loggerOtel.emit({
  //   severityNumber: logsAPI.SeverityNumber.INFO,
  //   severityText: "INFO",
  //   body: "App listening on ${port}",
  //   attributes: { "log.type": "LogRecord" },
  // });
});
