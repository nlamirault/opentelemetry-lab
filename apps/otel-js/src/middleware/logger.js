// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const pino = require("pino");

const logger = pino({
  formatters: {
    // level: (label) => {
    //   return {
    //     level: label,
    //   };
    // },
    level(label, number) {
      return { level: label };
    },
  },
});

module.exports = { logger };
