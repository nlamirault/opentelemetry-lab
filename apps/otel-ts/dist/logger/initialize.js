// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogger = initializeLogger;
var winston_1 = require("winston");
var logger_1 = require("./logger");
function initializeLogger() {
  var logger = (0, winston_1.createLogger)({
    level: "debug",
    defaultMeta: {
      // app: env.server.packageName,
      // version: env.package.version,
      component: "server",
    },
    format: winston_1.format.combine(
      winston_1.format.timestamp(),
      winston_1.format.metadata(),
      winston_1.format.errors({ stack: true }),
    ),
    transports: [
      new winston_1.transports.Console({
        format: winston_1.format.json(),
      }),
    ],
  });
  console.log = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return logger.info.apply(logger, args);
  };
  console.info = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return logger.info.call(logger, args);
  };
  console.warn = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return logger.warn.call(logger, args);
  };
  console.error = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return logger.error.call(logger, args);
  };
  // eslint-disable-next-line no-console
  console.debug = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return logger.debug.call(logger, args);
  };
  (0, logger_1.setLogger)(logger);
  return logger;
}
// # sourceMappingURL=initialize.js.map
