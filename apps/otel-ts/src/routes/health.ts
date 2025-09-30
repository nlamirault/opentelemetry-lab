// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, Router } from "express";

export function registerHealthRoutes(): Router {
  const router = Router();
  
  router.get("/health", (request: Request, response: Response) => {
    response.json({ status: "ok" });
  });

  return router;
}