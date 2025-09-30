// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"

	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
)

const (
	METRIC_BUILD_INFO = "opentelemetry_lab_build_info"
)

// InitBuildInfo creates and records the opentelemetry_lab_build_info metric
// with standard semantic conventions for language, service, and version.
func InitBuildInfo(ctx context.Context, meterProvider *sdkmetric.MeterProvider, serviceName string) error {
	meter := meterProvider.Meter("otel-go")
	buildInfo, err := meter.Int64Counter(METRIC_BUILD_INFO)
	if err != nil {
		return err
	}

	buildInfo.Add(ctx, 1, metric.WithAttributes(
		semconv.TelemetrySDKLanguageGo,
		semconv.ServiceName(serviceName),
		semconv.ServiceVersion("v1.0.0"),
	))

	return nil
}
