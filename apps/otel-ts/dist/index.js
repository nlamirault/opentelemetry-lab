// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("./app");
var otel_1 = require("./otel");
var logger_1 = require("./logger");
(0, otel_1.initializeOpenTelemetry)();
(0, logger_1.initializeLogger)();
(0, app_1.initializeApp)();
// # sourceMappingURL=index.js.map
