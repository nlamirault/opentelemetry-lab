// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express from "express";
import type { Express } from "express";

import { logger } from "../logger";
import { registerRoutes } from "../routes";

export async function initializeApp(): Promise<Express> {
  const app = express();

  // if (env.mode.prod) {
  //   app.use((await import("compression")).default());
  // }

  app.use(bodyParser.json());
  app.use(cookieParser());

  await registerRoutes(app);

  const port = 3333;

  try {
    await app.listen(Number(port), "0.0.0.0");

    logger.info(`App is running at: http://localhost:${port}`);
  } catch (err) {
    logger.error(err);
  }

  return app;
}
