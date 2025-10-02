// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { initializeApp } from "./app";
import { initializeLogger } from "./logger";
import { initializeOpenTelemetry } from "./otel";

async function bootstrap() {
  try {
    initializeOpenTelemetry();
    initializeLogger();
    await initializeApp();
  } catch (error) {
    console.error("Failed to bootstrap application:", error);
    process.exit(1);
  }
}

bootstrap();
