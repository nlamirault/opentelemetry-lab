// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package telemetry

import (
	"context"
	"fmt"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func InitTracer(ctx context.Context, resource *resource.Resource, otlpEndpoint string, protocol string) (*sdktrace.TracerProvider, error) {
	var otlpExporter sdktrace.SpanExporter
	var err error
	switch protocol {
	case "http":
		otlpExporter, err = otlptracehttp.New(
			ctx,
			otlptracehttp.WithEndpointURL(fmt.Sprintf("%s/v1/traces", otlpEndpoint)))
		if err != nil {
			return nil, err
		}
	case "grpc":
		otlpExporter, err = otlptracegrpc.New(ctx,
			otlptracegrpc.WithEndpointURL(otlpEndpoint))
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

	// Logging is handled by the global zap logger configured in telemetry/logger.go
	return provider, nil
}
