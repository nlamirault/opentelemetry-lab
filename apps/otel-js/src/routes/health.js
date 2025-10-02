// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const { getLogger } = require("../telemetry/shared");

async function healthRoutes(fastify) {
  fastify.get("/health", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "info",
      body: "Health handler",
    });
    return reply.send({ status: "ok" });
  });
}

module.exports = healthRoutes;
