// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");
const { logger } = require("../middleware/logger");
const router = express.Router();

router.get("/error_test", (req, res) => {
  logger.error("got error!!!!");
  throw new Error("value error");
});

module.exports = router;