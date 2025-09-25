// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"

	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

const (
	ENV_OTEL_DEBUG = "OTEL_DEBUG"
)

func CreateResource(ctx context.Context, serviceName string) (*sdkresource.Resource, error) {
	extraResources, _ := sdkresource.New(
		ctx,
		sdkresource.WithSchemaURL(semconv.SchemaURL),
		sdkresource.WithOS(),
		sdkresource.WithProcess(),
		sdkresource.WithContainer(),
		sdkresource.WithHost(),
		sdkresource.WithAttributes(
			semconv.ServiceName(serviceName)),
	)
	return sdkresource.Merge(
		sdkresource.Default(),
		extraResources,
	)
}
