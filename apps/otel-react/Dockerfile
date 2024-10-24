# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

# FROM node:20-alpine AS build

# WORKDIR /app

# COPY package*.json ./

# RUN npm install

# COPY . .

# RUN npm run build

# # --------------------
# #
# FROM node:20-alpine AS production

# WORKDIR /app

# COPY package*.json .

# RUN npm ci --only=production

# COPY --from=build /app/build ./dist

# CMD ["npm", "start"]

FROM node:20-alpine

WORKDIR /app

COPY ./package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]
