// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../otel/logging";

export async function registerVersionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/version",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = getLogger();
      logger.emit({
        severityText: "info",
        body: "Version handler",
      });
      return reply.send({
        version: "v1.0.0",
      });
    },
  );
}
