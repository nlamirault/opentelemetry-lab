// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../otel/logging";

export async function registerHealthRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = getLogger();
      logger.emit({
        severityText: "info",
        body: "Health handler",
      });
      return reply.send({ status: "ok" });
    },
  );
}
