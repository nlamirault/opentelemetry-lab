// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const { getLogger } = require("../telemetry/shared");
const router = express.Router();

router.get("/", (req, res) => {
  const logger = getLogger();
  logger.emit({
    severityText: "info",
    body: "Root handler",
  });
  res.send("OpenTelemetry Lab / Javascript");
});

module.exports = router;
