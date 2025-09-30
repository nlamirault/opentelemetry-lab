// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, Router } from "express";

export function registerRootRoutes(): Router {
  const router = Router();
  
  router.get("/", (request: Request, response: Response) => {
    response.send("OpenTelemetry Lab / Typescript");
  });

  return router;
}