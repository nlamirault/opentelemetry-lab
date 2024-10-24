// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveSpan = getActiveSpan;
exports.getActiveSpanContext = getActiveSpanContext;
var api_1 = require("@opentelemetry/api");
function getActiveSpan() {
  return api_1.trace.getActiveSpan();
}
function getActiveSpanContext() {
  var _a;
  return (_a = getActiveSpan()) === null || _a === void 0 ? void 0 : _a.spanContext();
}
// # sourceMappingURL=span.js.map
