// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const { getLogger } = require("../telemetry/shared");
const router = express.Router();

router.get("/health", (req, res) => {
  const logger = getLogger();
  logger.emit({
    severityText: "info",
    body: "Health handler",
  });
  res.json({ status: "ok" });
});

module.exports = router;
