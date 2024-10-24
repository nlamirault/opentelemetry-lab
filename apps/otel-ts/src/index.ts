import { initializeApp } from "./app";
import { initializeLogger } from "./logger";
import { initializeOpenTelemetry } from "./otel";

initializeOpenTelemetry();
initializeLogger();
initializeApp();
