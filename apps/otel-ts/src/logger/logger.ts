// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from "winston";

export let logger: Logger;

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}
