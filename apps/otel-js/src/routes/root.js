// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const logger = pino();
const router = express.Router();

router.get("/", (req, res) => {
  logger.info("Root handler");
  res.send("OpenTelemetry Lab / Javascript");
});

module.exports = router;