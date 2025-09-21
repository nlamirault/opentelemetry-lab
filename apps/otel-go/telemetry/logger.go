// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"fmt"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutlog"
	"go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func InitLogger(ctx context.Context, resource *resource.Resource, serviceName string, otlpEndpoint string, protocol string) (*sdklog.LoggerProvider, error) {
	var otlpExporter sdklog.Exporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlploghttp.New(
			ctx,
			otlploghttp.WithEndpointURL(fmt.Sprintf("%s/v1/logs", otlpEndpoint)))
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlploggrpc.New(ctx,
			otlploggrpc.WithEndpointURL(otlpEndpoint))
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

	global.SetLoggerProvider(provider)

	atom := zap.NewAtomicLevel()
	atom.SetLevel(zap.InfoLevel)
	config := zap.Config{
		Level:             atom,
		Encoding:          "json",
		OutputPaths:       []string{"stdout"},
		ErrorOutputPaths:  []string{"stderr"},
		InitialFields:     map[string]interface{}{"service": serviceName},
		EncoderConfig:     zap.NewProductionEncoderConfig(),
		DisableStacktrace: true,
	}
	log, err := config.Build()
	if err != nil {
		return nil, err
	}
	otelCore := zap.WrapCore(func(c zapcore.Core) zapcore.Core {
		return zapcore.NewTee(
			zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), zapcore.InfoLevel),
			otelzap.NewCore(serviceName, otelzap.WithLoggerProvider(global.GetLoggerProvider())),
		)
	})
	logger := log.WithOptions(otelCore)

	// core := zapcore.NewTee(
	// 	zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), zapcore.InfoLevel),
	// 	otelzap.NewCore(serviceName, otelzap.WithLoggerProvider(global.GetLoggerProvider())),
	// )
	// logger := zap.New(core)

	// Replace global zap logger
	zap.ReplaceGlobals(logger)

	zap.L().Info("OpenTelemetry logger provider done", zap.String("service", serviceName))
	return provider, nil
}
