// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { LoggerProvider } from "@opentelemetry/sdk-logs";

// Use any type for now due to API version compatibility
type Logger = any;

let logger: Logger | null = null;

export function setLoggerProvider(provider: LoggerProvider): void {
  logger = provider.getLogger("otel-ts");
}

export function getLogger(): Logger {
  if (!logger) {
    throw new Error("Logger not initialized. Call setLoggerProvider first.");
  }
  return logger;
}