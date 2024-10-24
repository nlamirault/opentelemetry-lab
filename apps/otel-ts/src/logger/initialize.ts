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
    format: format.combine(
      format.timestamp(),
      format.metadata(),
      format.errors({ stack: true }),
    ),
    transports: [
      new transports.Console({
        format: format.json(),
      }),
    ],
  });

  console.log = (...args: any[]) => logger.info.apply(logger, args as any);
  console.info = (...args: any[]) => logger.info.call(logger, args as any);
  console.warn = (...args: any[]) => logger.warn.call(logger, args as any);
  console.error = (...args: any[]) => logger.error.call(logger, args as any);
  // eslint-disable-next-line no-console
  console.debug = (...args: any[]) => logger.debug.call(logger, args as any);

  setLogger(logger);

  return logger;
}
