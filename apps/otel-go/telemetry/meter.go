// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"encoding/json"
	"os"

	"go.opentelemetry.io/contrib/exporters/autoexport"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
)

// InitMeter configures the push reader from the OTEL_METRICS_EXPORTER and
// OTEL_EXPORTER_OTLP_* environment variables. Metrics are also exposed for
// Prometheus scraping on /metrics.
func InitMeter(ctx context.Context, resource *resource.Resource) (*sdkmetric.MeterProvider, error) {
	reader, err := autoexport.NewMetricReader(ctx)
	if err != nil {
		return nil, err
	}

	// Create Prometheus exporter
	promExporter, err := prometheus.New()
	if err != nil {
		return nil, err
	}

	opts := []sdkmetric.Option{
		sdkmetric.WithResource(resource),
		sdkmetric.WithReader(reader),
		sdkmetric.WithReader(promExporter),
	}
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
		opts = append(opts, sdkmetric.WithReader(sdkmetric.NewPeriodicReader(stdoutExporter)))
	}
	provider := sdkmetric.NewMeterProvider(opts...)

	otel.SetMeterProvider(provider)

	// Logging is handled by the global zap logger configured in telemetry/logger.go
	return provider, nil
}
