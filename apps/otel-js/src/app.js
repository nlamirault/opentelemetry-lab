// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const routes = require("./routes/index");
const otel = require("./telemetry/otel");

const logger = pino();
const app = express();
const port = process.env.EXPOSE_PORT || 3000;

otel.setup_opentelemetry();

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
