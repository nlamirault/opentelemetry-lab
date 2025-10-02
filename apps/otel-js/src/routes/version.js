// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const { getLogger } = require("../telemetry/shared");

async function versionRoutes(fastify) {
  fastify.get("/version", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "info",
      body: "Version handler",
    });
    return reply.send({ version: "v1.0.0" });
  });
}

module.exports = versionRoutes;
