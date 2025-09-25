# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM golang:1.23-alpine AS base
COPY . /usr/src/otel-go/
WORKDIR /usr/src/otel-go/
RUN go install /usr/src/otel-go/ 
CMD ["/go/bin/otel-go"]