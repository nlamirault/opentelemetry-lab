// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const { metrics } = require("@opentelemetry/api");
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_TELEMETRY_SDK_LANGUAGE,
} = require("@opentelemetry/semantic-conventions");
const { METRIC_BUILD_INFO } = require("../constants");

/**
 * Creates and initializes the build info metric using OpenTelemetry
 * @param {string} serviceName - Name of the service
 * @returns {void}
 */
function initBuildInfoMetric(serviceName = "otel-js") {
  // Get the OpenTelemetry meter
  const meter = metrics.getMeter(serviceName, "1.0.0");

  // Create build info counter metric
  const buildInfoCounter = meter.createCounter(METRIC_BUILD_INFO, {
    description: "Build information for the OpenTelemetry lab application",
  });

  // Record the build info metric with standard semantic conventions
  buildInfoCounter.add(1, {
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: "v1.0.0",
    [ATTR_TELEMETRY_SDK_LANGUAGE]: "nodejs",
  });
}

module.exports = {
  initBuildInfoMetric,
};
