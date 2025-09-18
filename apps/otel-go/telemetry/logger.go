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

	global.SetLoggerProvider(provider)

	// Create JSON encoder config with timestamp, level, and message
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "timestamp"
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.LevelKey = "level"
	encoderConfig.EncodeLevel = zapcore.LowercaseLevelEncoder
	encoderConfig.MessageKey = "message"
	encoderConfig.CallerKey = "caller"
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder

	// Create JSON encoder
	// jsonEncoder := zapcore.NewJSONEncoder(encoderConfig)
	// Create core that combines JSON logging with OpenTelemetry bridge
	// otelCore := otelzap.NewCore(serviceName, otelzap.WithLoggerProvider(provider))
	// combinedCore := zapcore.NewTee(
	// 	otelCore,
	// 	zapcore.NewCore(jsonEncoder, zapcore.AddSync(os.Stdout), zapcore.InfoLevel),
	// )

	// logger := zap.New(combinedCore, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	core := zapcore.NewTee(
		zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), zapcore.InfoLevel),
		otelzap.NewCore(serviceName, otelzap.WithLoggerProvider(global.GetLoggerProvider())),
	)
	logger := zap.New(core)

	// Replace global zap logger
	zap.ReplaceGlobals(logger)

	zap.L().Info("OpenTelemetry logger provider done", zap.String("service", serviceName))
	return provider, nil
}

// Info is a wrapper around the zap.L().Info() function, which adds all fields from the passed context to the log
// message.
func Info(ctx context.Context, msg string, fields ...zapcore.Field) {
	zap.L().Info(msg, fields...)
}

// Warn is a wrapper around the zap.L().Warn() function, which adds all fields from the passed context to the log
// message.
func Warn(ctx context.Context, msg string, fields ...zapcore.Field) {
	zap.L().Warn(msg, fields...)
}

// Error is a wrapper around the zap.L().Error() function, which adds all fields from the passed context to the log
// message.
func Error(ctx context.Context, msg string, fields ...zapcore.Field) {
	zap.L().Error(msg, fields...)
}

// Fatal is a wrapper around the zap.L().Fatal() function, which adds all fields from the passed context to the log
// message.
func Fatal(ctx context.Context, msg string, fields ...zapcore.Field) {
	zap.L().Fatal(msg, fields...)
}

// Panic is a wrapper around the zap.L().Panic() function, which adds all fields from the passed context to the log
// message.
func Panic(ctx context.Context, msg string, fields ...zapcore.Field) {
	zap.L().Panic(msg, fields...)
}
