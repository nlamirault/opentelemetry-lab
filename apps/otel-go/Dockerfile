# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM golang:1.25-alpine AS build

ARG VERSION=v1.0.0

WORKDIR /usr/src/otel-go

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath \
      -ldflags "-s -w -X github.com/nlamirault/otel-go/version.Version=${VERSION}" \
      -o /out/otel-go .

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/otel-go /usr/local/bin/otel-go

EXPOSE 8888

ENTRYPOINT ["/usr/local/bin/otel-go"]
