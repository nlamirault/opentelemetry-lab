// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FastifyInstance } from "fastify";
import { registerRootRoutes } from "./root";
import { registerHealthRoutes } from "./health";
import { registerVersionRoutes } from "./version";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Register individual route modules
  await registerRootRoutes(fastify);
  await registerHealthRoutes(fastify);
  await registerVersionRoutes(fastify);
}
