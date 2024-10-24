// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"

	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"

	// stdout "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

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

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(otlpExporter),
		// sdktrace.WithBatcher(stdoutExporter),
		sdktrace.WithResource(resource),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	return tp, nil
}

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
		otlpExporter, err = otlploggrpc.New(ctx)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported protocol: %s", protocol)
	}

	lp := sdklog.NewLoggerProvider(
		sdklog.WithProcessor(
			sdklog.NewBatchProcessor(otlpExporter),
		),
		sdklog.WithResource(resource),
	)

	defer lp.Shutdown(ctx)

	global.SetLoggerProvider(lp)
	logger := otelslog.NewLogger(serviceName)
	logger.Debug("Something interesting happened")
	return lp, nil
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

	mp := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(resource),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpExporter)))
	// sdkmetric.WithReader(sdkmetric.NewPeriodicReader(otlpExporter)))
	if err != nil {
		return nil, err
	}

	otel.SetMeterProvider(mp)
	return mp, nil
}
