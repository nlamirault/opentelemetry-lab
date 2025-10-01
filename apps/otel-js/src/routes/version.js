// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const { getLogger } = require("../telemetry/shared");
const router = express.Router();

router.get("/version", (req, res) => {
  const logger = getLogger();
  logger.emit({
    severityText: "info",
    body: "Version handler",
  });
  res.json({ version: "v1.0.0" });
});

module.exports = router;
