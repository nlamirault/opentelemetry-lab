// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const { getLogger } = require("../telemetry/shared");

async function rootRoutes(fastify) {
  fastify.get("/", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "info",
      body: "Root handler",
    });
    return reply.send("OpenTelemetry Lab / Javascript");
  });
}

module.exports = rootRoutes;
