// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const routes = require("./routes/index");
const otel = require("./telemetry/otel");
const { initBuildInfoMetric } = require("./telemetry/metrics");
const { logger } = require("./middleware/logger");

// const logger = pino();

const app = express();
const port = process.env.EXPOSE_PORT || 3000;

otel.setup_opentelemetry();

// Initialize build info metric after OpenTelemetry setup
const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";
initBuildInfoMetric(serviceName);

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
