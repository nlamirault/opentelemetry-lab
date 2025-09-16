// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutlog"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

const (
	ENV_OTEL_DEBUG = "OTEL_DEBUG"
)

func initLogger(ctx context.Context, resource *resource.Resource, serviceName string, protocol string) (*sdklog.LoggerProvider, error) {
	var otlpExporter sdklog.Exporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlploghttp.New(ctx)
		if err != nil {
			return nil, err
		}
	case "grpc":
		fmt.Printf("OpenTelemetry with GRPC")
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

func initTracer(ctx context.Context, resource *resource.Resource, protocol string) (*sdktrace.TracerProvider, error) {
	// stdoutExporter, err := stdout.New(stdout.WithPrettyPrint())
	// if err != nil {
	// 	return nil, err
	// }

	var otlpExporter sdktrace.SpanExporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlptracehttp.New(ctx)
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlptracegrpc.New(ctx)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported protocol: %s", protocol)
	}

	var provider *sdktrace.TracerProvider
	if os.Getenv(ENV_OTEL_DEBUG) != "" {
		stdoutExporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
		if err != nil {
			return nil, err
		}

		provider = sdktrace.NewTracerProvider(
			sdktrace.WithSampler(sdktrace.AlwaysSample()),
			sdktrace.WithBatcher(otlpExporter),
			sdktrace.WithBatcher(stdoutExporter),
			sdktrace.WithResource(resource),
		)
	} else {
		provider = sdktrace.NewTracerProvider(
			sdktrace.WithSampler(sdktrace.AlwaysSample()),
			sdktrace.WithBatcher(otlpExporter),
			sdktrace.WithResource(resource),
		)
	}

	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))

	slog.InfoContext(ctx, "OpenTelemetry tracer provider done")
	return provider, nil
}

func initMeter(ctx context.Context, resource *resource.Resource, protocol string) (*sdkmetric.MeterProvider, error) {
	var otlpExporter sdkmetric.Exporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlpmetrichttp.New(ctx)
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlpmetricgrpc.New(ctx)
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

	slog.InfoContext(ctx, "OpenTelemetry tracer provider done")
	return provider, nil
}
