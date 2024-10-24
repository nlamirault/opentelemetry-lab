// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracer = getTracer;
var api_1 = require("@opentelemetry/api");
var serviceName = process.env.OTEL_SERVICE_NAME || "otel-ts";
function getTracer() {
  return api_1.trace.getTracer(serviceName, "1.0.0");
}
// # sourceMappingURL=tracer.js.map
