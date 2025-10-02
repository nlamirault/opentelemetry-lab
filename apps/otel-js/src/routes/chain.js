// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const axios = require("axios");
const { getLogger } = require("../telemetry/shared");

const port = process.env.EXPOSE_PORT || 3000;
const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

async function chainRoutes(fastify) {
  fastify.get("/chain", async (request, reply) => {
    const logger = getLogger();
    logger.emit({
      severityText: "info",
      body: "Chain Start",
    });
    await axios.get(`http://${TARGET_ONE_SVC}/`);
    await axios.get(`http://${TARGET_ONE_SVC}/`);
    await axios.get(`http://${TARGET_TWO_SVC}/`);
    logger.emit({
      severityText: "info",
      body: "Chain Finished",
    });
    return reply.send({ path: "/chain" });
  });
}

module.exports = chainRoutes;
