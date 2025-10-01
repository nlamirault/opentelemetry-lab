// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const express = require("express");

const rootRoutes = require("./root");
const healthRoutes = require("./health");
const versionRoutes = require("./version");
const metricsRoutes = require("./metrics");
const errorRoutes = require("./error");
const chainRoutes = require("./chain");

const router = express.Router();

router.use(rootRoutes);
router.use(healthRoutes);
router.use(versionRoutes);
router.use(metricsRoutes);
router.use(errorRoutes);
router.use(chainRoutes);

module.exports = router;
