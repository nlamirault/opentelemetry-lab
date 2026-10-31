// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Fastify, { FastifyInstance } from "fastify";

import { logger } from "../logger";
import { registerRoutes } from "../routes";

export async function initializeApp(): Promise<FastifyInstance> {
  // The @fastify/otel plugin is registered on creation by the SDK
  // (registerOnInitialization in src/instrumentation.ts).
  const fastify = Fastify({ logger: false });

  await registerRoutes(fastify);

  const port = process.env.EXPOSE_PORT || 6666;
  try {
    await fastify.listen({ port: Number(port), host: "0.0.0.0" });

    logger.info(`App is running at: http://localhost:${port}`);
  } catch (err) {
    logger.error(err);
  }

  return fastify;
}
