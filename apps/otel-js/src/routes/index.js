// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const rootRoutes = require("./root");
const healthRoutes = require("./health");
const versionRoutes = require("./version");
const metricsRoutes = require("./metrics");
const errorRoutes = require("./error");
const chainRoutes = require("./chain");

async function routes(fastify) {
  await fastify.register(rootRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(versionRoutes);
  await fastify.register(metricsRoutes);
  await fastify.register(errorRoutes);
  await fastify.register(chainRoutes);
}

module.exports = routes;
