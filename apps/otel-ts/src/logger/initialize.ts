// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { format as formatArgs } from "node:util";
import { createLogger as winstonCreateLogger, format, transports } from "winston";
import type { Logger } from "winston";

import { setLogger } from "./logger";

export function initializeLogger(): Logger {
  const logger = winstonCreateLogger({
    level: "debug",
    defaultMeta: {
      // app: env.server.packageName,
      // version: env.package.version,
      component: "server",
    },
    // errors() must run at the logger level: transports only get a copy of
    // the Error, without its non-enumerable message and stack.
    format: format.errors({ stack: true }),
    // timestamp() and metadata() live on the Console transport so the
    // OpenTelemetry transport, added by the winston instrumentation, gets
    // flat attributes.
    transports: [
      new transports.Console({
        format: format.combine(
          format.timestamp(),
          format.metadata(),
          format.json(),
        ),
      }),
    ],
  });

  // Format arguments like the native console does (OpenTelemetry diag
  // output goes through here too).
  console.log = (...args: unknown[]) => logger.info(formatArgs(...args));
  console.info = (...args: unknown[]) => logger.info(formatArgs(...args));
  console.warn = (...args: unknown[]) => logger.warn(formatArgs(...args));
  console.error = (...args: unknown[]) => logger.error(formatArgs(...args));
  console.debug = (...args: unknown[]) => logger.debug(formatArgs(...args));

  setLogger(logger);

  return logger;
}
