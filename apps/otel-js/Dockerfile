# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM node:20.11.0-alpine3.19 as build

WORKDIR /app

COPY . .

RUN yarn install

CMD node app.js
