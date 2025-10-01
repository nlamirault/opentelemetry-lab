// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const routes = require("./routes/index");
const otel = require("./telemetry/otel");
const { initBuildInfoMetric } = require("./telemetry/metrics");
// Import shared module for setLoggerProvider
const shared = require("./telemetry/shared");

// const logger = pino();

const app = express();
const port = process.env.EXPOSE_PORT || 3000;

const { loggerProvider } = otel.setup_opentelemetry();

// Set the logger provider for shared access
shared.setLoggerProvider(loggerProvider);

// Initialize build info metric after OpenTelemetry setup
const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js";
initBuildInfoMetric(serviceName);

// Now we can use the logger
const logger = shared.getLogger();
logger.emit({
  severityText: 'info',
  body: 'Bootstrap the OpenTelemetry application',
});

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
