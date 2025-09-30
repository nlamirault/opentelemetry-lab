// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, Router } from "express";

export function registerVersionRoutes(): Router {
  const router = Router();
  
  router.get("/version", (request: Request, response: Response) => {
    response.json({
      version: "v1.0.0",
    });
  });

  return router;
}