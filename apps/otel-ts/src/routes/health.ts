// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../logger";

export async function registerHealthRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      logger.info("Health handler");
      return reply.send({ status: "ok" });
    },
  );
}
