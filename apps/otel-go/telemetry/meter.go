// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
)

func InitMeter(ctx context.Context, resource *resource.Resource, otlpEndpoint string, protocol string) (*sdkmetric.MeterProvider, error) {
	var otlpExporter sdkmetric.Exporter
	var err error

	switch protocol {
	case "http":
		otlpExporter, err = otlpmetrichttp.New(
			ctx,
			otlpmetrichttp.WithEndpointURL(fmt.Sprintf("%s/v1/metrics", otlpEndpoint)))
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlpmetricgrpc.New(ctx,
			otlpmetricgrpc.WithEndpointURL(otlpEndpoint))
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported protocol: %s", protocol)
	}

	var provider *sdkmetric.MeterProvider
	if os.Getenv(ENV_OTEL_DEBUG) != "" {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		stdoutExporter, err := stdoutmetric.New(
			stdoutmetric.WithEncoder(enc),
			stdoutmetric.WithoutTimestamps(),
		)
		if err != nil {
			return nil, err
		}

		provider = sdkmetric.NewMeterProvider(
			sdkmetric.WithResource(resource),
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpExporter)),
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(stdoutExporter)),
		)
	} else {
		provider = sdkmetric.NewMeterProvider(
			sdkmetric.WithResource(resource),
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpExporter)),
		)
	}

	otel.SetMeterProvider(provider)

	// Logging is handled by the global zap logger configured in telemetry/logger.go
	return provider, nil
}
