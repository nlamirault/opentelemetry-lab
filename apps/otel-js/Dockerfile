# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM node:24.22.2-alpine3.24 as build

WORKDIR /app

COPY . .

RUN yarn install

CMD ["node", "src/app.js"]
