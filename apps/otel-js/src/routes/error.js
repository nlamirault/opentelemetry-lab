// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const { getLogger } = require("../telemetry/shared");
const router = express.Router();

router.get("/error_test", (req, res) => {
  const logger = getLogger();
  logger.emit({
    severityText: "error",
    body: "got error!!!!",
  });
  throw new Error("value error");
});

module.exports = router;
