// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const { getLogger } = require("../telemetry/shared");

async function errorRoutes(fastify) {
  fastify.get("/error_test", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "error",
      body: "got error!!!!",
    });
    throw new Error("value error");
  });
}

module.exports = errorRoutes;
