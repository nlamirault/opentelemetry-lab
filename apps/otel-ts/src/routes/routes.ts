// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";

// import { getVersionHandler } from "./versionHandler";

export async function registerRoutes(app: Express): Promise<Router> {
  const globalRouter = Router();
  // app.use(serverTimingMiddleware);
  // app.use(traceparentMiddleware);
  // registerApiRoutes(globalRouter, app);
  // globalRouter.get("/", getVersionHandler);
  globalRouter.get("/", (request, response) => {
    response.send("OpenTelemetry Lab / Typescript");
  });
  globalRouter.get("/version", (request, response) => {
    response.send({
      version: "v1.0.0",
    });
  });
  app.use(globalRouter);
  return globalRouter;
}
