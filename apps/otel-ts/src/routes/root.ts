// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../logger";

export async function registerRootRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info("Root handler");
    return reply.send("OpenTelemetry Lab / Typescript");
  });
}
