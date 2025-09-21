// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/host"
	otelruntime "go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	"go.uber.org/zap"

	"github.com/nlamirault/otel-go/router"
	"github.com/nlamirault/otel-go/telemetry"
)

var tracer = otel.Tracer("otel-go")

func main() {
	ctx := context.Background()

	// logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
	// 	AddSource: true,
	// 	Level:     slog.LevelDebug,
	// }))
	// slog.SetDefault(logger)

	// log.SetOutput(os.Stderr)
	// if os.Getenv("DEBUG") == "true" {
	// 	slog.SetLogLoggerLevel(slog.LevelDebug)
	// }

	// logger := slog.New(
	// 	slogformatter.NewFormatterHandler(
	// 		slogformatter.TimezoneConverter(time.UTC),
	// 		slogformatter.TimeFormatter(time.RFC3339, nil),
	// 		slogformatter.HTTPRequestFormatter(false),
	//     	slogformatter.HTTPResponseFormatter(false),
	// 	)(
	// 		// slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{}),
	// 		slog.NewJSONHandler(os.Stdout, nil),
	// 	),
	// )

	// // Add an attribute to all log entries made through this logger.
	// logger = logger.With("gin_mode", gin.EnvGinMode)

	serviceName := "otel-go"
	if os.Getenv("OTEL_SERVICE_NAME") != "" {
		// slog.Info("Use OTEL_SERVICE_NAME variable")
		serviceName = os.Getenv("OTEL_SERVICE_NAME")
	}

	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		log.Fatal("OpenTelemetry endpoint not specified")
	}

	protocol := os.Getenv("OTEL_EXPORTER_OTLP_PROTOCOL")
	if protocol == "" {
		log.Fatal("OpenTelemetry protocol not specified")
	}

	// extraResources, _ := sdkresource.New(
	// 	ctx,
	// 	sdkresource.WithOS(),
	// 	sdkresource.WithProcess(),
	// 	sdkresource.WithContainer(),
	// 	sdkresource.WithHost(),
	// 	sdkresource.WithAttributes(
	// 		// semconv.SchemaURL,
	// 		semconv.ServiceName(serviceName)),
	// )
	// resource, _ := sdkresource.Merge(
	// 	sdkresource.Default(),
	// 	extraResources,
	// )
	resource, err := telemetry.CreateResource(ctx, serviceName)
	if err != nil {
		log.Fatal(err)
	}

	lp, err := telemetry.InitLogger(ctx, resource, serviceName, endpoint, protocol)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := lp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down logger provider: %v", err)
		}
	}()

	tp, err := telemetry.InitTracer(ctx, resource, endpoint, protocol)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	mp, err := telemetry.InitMeter(ctx, resource, endpoint, protocol)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := mp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down meter provider: %v", err)
		}
	}()

	if err = otelruntime.Start(
		otelruntime.WithMinimumReadMemStatsInterval(time.Second),
		otelruntime.WithMeterProvider(mp),
	); err != nil {
		log.Fatal(err)
	}

	if err = host.Start(host.WithMeterProvider(mp)); err != nil {
		log.Fatal(err)
	}

	r := router.New(serviceName)
	r.SetupRoutes()

	port := os.Getenv("EXPOSE_PORT")
	if len(port) == 0 {
		port = "8888"
	}
	zap.L().Info("Starting server")
	r.Engine().Run(fmt.Sprintf(":%s", port))
}
