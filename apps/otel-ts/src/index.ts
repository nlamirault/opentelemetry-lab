// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Must stay the first import: the SDK has to start before fastify loads `http`,
// even when the app is run without `--require ./dist/instrumentation.js`.
import { sdk } from "./instrumentation";

import type { FastifyInstance } from "fastify";

import { initializeApp } from "./app";
import { initializeLogger, logger } from "./logger";

// Stay under Docker's 10s stop grace period even when the collector hangs.
const SHUTDOWN_TIMEOUT_MS = 5000;

function registerShutdown(app: FastifyInstance): void {
  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info(`Received ${signal}, shutting down`);
    setTimeout(() => {
      logger.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    try {
      // Close the server first so in-flight request spans end before the flush.
      await app.close();
      await sdk.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error(`Failed to shut down cleanly: ${error}`);
      process.exit(1);
    }
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

async function bootstrap() {
  try {
    initializeLogger();
    const app = await initializeApp();
    registerShutdown(app);
  } catch (error) {
    console.error("Failed to bootstrap application:", error);
    process.exit(1);
  }
}

bootstrap();
