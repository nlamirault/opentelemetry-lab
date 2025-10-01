// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const axios = require("axios");
const express = require("express");
const pino = require("pino");

const logger = pino();
const router = express.Router();

const port = process.env.EXPOSE_PORT || 3000;
const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

router.get("/chain", async (req, res) => {
  logger.info("Chain Start");
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_TWO_SVC}/`);
  logger.info("Chain Finished");
  res.json({ path: "/chain" });
});

module.exports = router;