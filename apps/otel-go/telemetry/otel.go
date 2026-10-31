// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"errors"
	"log"

	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
)

const (
	ENV_OTEL_DEBUG = "OTEL_DEBUG"
)

func CreateResource(ctx context.Context, serviceName string) (*sdkresource.Resource, error) {
	extraResources, err := sdkresource.New(
		ctx,
		sdkresource.WithSchemaURL(semconv.SchemaURL),
		sdkresource.WithOS(),
		sdkresource.WithProcess(),
		sdkresource.WithContainer(),
		sdkresource.WithHost(),
		sdkresource.WithAttributes(
			semconv.ServiceName(serviceName)),
	)
	if err != nil {
		// Some detectors can fail (e.g. process owner in minimal images):
		// keep the attributes that were detected.
		if !errors.Is(err, sdkresource.ErrPartialResource) {
			return nil, err
		}
		log.Printf("Partial OpenTelemetry resource: %v", err)
	}
	return sdkresource.Merge(
		sdkresource.Default(),
		extraResources,
	)
}
