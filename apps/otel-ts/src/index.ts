// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { initializeApp } from "./app";
import { initializeLogger } from "./logger";
import { initializeOpenTelemetry } from "./otel";

initializeOpenTelemetry();
initializeLogger();
initializeApp();
