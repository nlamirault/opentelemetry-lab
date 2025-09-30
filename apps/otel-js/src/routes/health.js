// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const logger = pino();
const router = express.Router();

router.get("/health", (req, res) => {
  logger.info("Health handler");
  res.json({ status: "ok" });
});

module.exports = router;
