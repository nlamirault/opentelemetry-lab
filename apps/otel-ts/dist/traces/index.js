// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracer = exports.getActiveSpanContext = exports.getActiveSpan = void 0;
var span_1 = require("./span");
Object.defineProperty(exports, "getActiveSpan", {
  enumerable: true,
  get: function() {
    return span_1.getActiveSpan;
  },
});
Object.defineProperty(exports, "getActiveSpanContext", {
  enumerable: true,
  get: function() {
    return span_1.getActiveSpanContext;
  },
});
var tracer_1 = require("./tracer");
Object.defineProperty(exports, "getTracer", {
  enumerable: true,
  get: function() {
    return tracer_1.getTracer;
  },
});
// # sourceMappingURL=index.js.map
