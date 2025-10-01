// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import { registerRootRoutes } from "./root";
import { registerHealthRoutes } from "./health";
import { registerVersionRoutes } from "./version";

export async function registerRoutes(app: Express): Promise<Router> {
  const globalRouter = Router();
  
  // Register individual route modules
  globalRouter.use(registerRootRoutes());
  globalRouter.use(registerHealthRoutes());
  globalRouter.use(registerVersionRoutes());
  
  app.use(globalRouter);
  return globalRouter;
}
