// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutlog"
	"go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
)

func InitLogger(ctx context.Context, resource *resource.Resource, serviceName string, protocol string) (*sdklog.LoggerProvider, error) {
	var otlpExporter sdklog.Exporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlploghttp.New(ctx)
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlploggrpc.New(ctx)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported protocol: %s", protocol)
	}

	var provider *sdklog.LoggerProvider
	if os.Getenv(ENV_OTEL_DEBUG) != "" {
		stdoutExporter, err := stdoutlog.New()
		if err != nil {
			return nil, err
		}

		provider = sdklog.NewLoggerProvider(
			sdklog.WithProcessor(sdklog.NewBatchProcessor(otlpExporter)),
			sdklog.WithProcessor(sdklog.NewSimpleProcessor(stdoutExporter)),
			sdklog.WithResource(resource),
		)
	} else {
		provider = sdklog.NewLoggerProvider(
			sdklog.WithProcessor(sdklog.NewBatchProcessor(otlpExporter)),
			sdklog.WithResource(resource),
		)
	}

	// defer provider.Shutdown(ctx)

	global.SetLoggerProvider(provider)

	logger := otelslog.NewLogger(serviceName, otelslog.WithLoggerProvider(provider))
	slog.SetDefault(logger)

	slog.InfoContext(ctx, "OpenTelemetry logger provider done", "service", serviceName)
	return provider, nil
}
