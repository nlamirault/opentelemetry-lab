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

  return faro;
}
