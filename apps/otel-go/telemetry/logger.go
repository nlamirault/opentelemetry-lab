// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	"go.opentelemetry.io/contrib/exporters/autoexport"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutlog"
	"go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// InitLogger configures the exporter from the OTEL_LOGS_EXPORTER and
// OTEL_EXPORTER_OTLP_* environment variables, and replaces the global zap
// logger with one writing JSON to stdout and records to OpenTelemetry.
func InitLogger(ctx context.Context, resource *resource.Resource, serviceName string) (*sdklog.LoggerProvider, error) {
	exporter, err := autoexport.NewLogExporter(ctx)
	if err != nil {
		return nil, err
	}

	opts := []sdklog.LoggerProviderOption{
		sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter)),
		sdklog.WithResource(resource),
	}
	if os.Getenv(envOTelDebug) != "" {
		stdoutExporter, err := stdoutlog.New()
		if err != nil {
			return nil, err
		}
		opts = append(opts, sdklog.WithProcessor(sdklog.NewSimpleProcessor(stdoutExporter)))
	}
	provider := sdklog.NewLoggerProvider(opts...)

	global.SetLoggerProvider(provider)

	level := zap.NewAtomicLevelAt(zap.InfoLevel)
	// The service field is only added to stdout: OpenTelemetry log records
	// already carry it as the service.name resource attribute.
	stdoutCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()),
		zapcore.Lock(os.Stdout),
		level,
	).With([]zapcore.Field{zap.String("service", serviceName)})
	otelCore, err := zapcore.NewIncreaseLevelCore(
		otelzap.NewCore(serviceName, otelzap.WithLoggerProvider(provider)),
		level,
	)
	if err != nil {
		return nil, err
	}
	logger := zap.New(
		zapcore.NewTee(stdoutCore, otelCore),
		zap.AddCaller(),
		zap.ErrorOutput(zapcore.Lock(os.Stderr)),
	)

	// Replace global zap logger
	zap.ReplaceGlobals(logger)

	zap.L().Info("OpenTelemetry logger provider done")
	return provider, nil
}
