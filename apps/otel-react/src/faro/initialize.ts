// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  getWebInstrumentations,
  initializeFaro as coreInit,
  ReactIntegration,
  ReactRouterVersion,
} from "@grafana/faro-react";
import type { Faro } from "@grafana/faro-react";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { METRIC_BUILD_INFO } from "../constants";

export function initializeFaro(): Faro {
  const serviceName = process.env.OTEL_SERVICE_NAME || "otel-react";
  const faroEndpoint = process.env.FARO_ENDPOINT || "http://otel_collector:3333";
  const faro = coreInit({
    url: faroEndpoint,
    trackWebVitalsAttribution: true,
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),

      new TracingInstrumentation({
        instrumentationOptions: {
          fetchInstrumentationOptions: {
            applyCustomAttributesOnSpan: () => {
              console.log(
                "fetchInstrumentationOptions: applyCustomAttributesOnSpan",
              );
            },
          },
          xhrInstrumentationOptions: {
            applyCustomAttributesOnSpan: () => {
              console.log(
                "xhrInstrumentationOptions: applyCustomAttributesOnSpan",
              );
            },
          },
        },
      }),
      new ReactIntegration({
        router: {
          version: ReactRouterVersion.V6,
          dependencies: {
            createRoutesFromChildren,
            matchRoutes,
            Routes,
            useLocation,
            useNavigationType,
          },
        },
      }),
    ],
    app: {
      name: serviceName,
      namespace: "otel_lab",
      version: "1.0.0",
      environment: "prod",
    },
  });

  faro.api.pushLog(["Faro was initialized"]);

  // Create build info metric
  // Note: Faro uses OpenTelemetry under the hood, but for frontend apps
  // we'll add this as a custom event/metric through Faro's API
  faro.api.pushEvent(METRIC_BUILD_INFO, {
    language: "react",
    version: "v1.0.0",
    service: serviceName,
  });

  return faro;
}
