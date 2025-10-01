// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const pino = require("pino");

const logger = pino();
const router = express.Router();

router.get("/version", (req, res) => {
  logger.info("Version handler");
  res.json({ version: "v1.0.0" });
});

module.exports = router;