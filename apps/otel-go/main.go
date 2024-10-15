// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/host"
	otelruntime "go.opentelemetry.io/contrib/instrumentation/runtime"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	oteltrace "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("otel-go")

func setupRouter(serviceName string) *gin.Engine {
	// Disable Console Color
	gin.DisableConsoleColor()
	router := gin.Default()
	router.Use(otelgin.Middleware(serviceName))

	router.GET("/health", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})
	router.GET("/", rootHandler)
	router.GET("/chain", chainHandler)
	return router
}

func httpErrorBadRequest(err error, span oteltrace.Span, ctx *gin.Context) {
	httpError(err, span, ctx, http.StatusBadRequest)
}

func httpErrorInternalServerError(err error, span oteltrace.Span, ctx *gin.Context) {
	httpError(err, span, ctx, http.StatusInternalServerError)
}

func httpStatusUnauthorized(err error, span oteltrace.Span, ctx *gin.Context) {
	httpError(err, span, ctx, http.StatusUnauthorized)
}

func httpError(err error, span oteltrace.Span, ctx *gin.Context, status int) {
	log.Println(err.Error())
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())
	ctx.String(status, err.Error())
}

func main() {
	ctx := context.Background()

	logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
		AddSource: true,
		Level:     slog.LevelDebug,
	}))
	slog.SetDefault(logger)

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
		slog.Info("Use OTEL_SERVICE_NAME variable")
		serviceName = os.Getenv("OTEL_SERVICE_NAME")
	}

	protocol := os.Getenv("OTEL_EXPORTER_OTLP_PROTOCOL")
	if protocol == "" {
		log.Fatal("OpenTelemetry protocol not specified")
	}

	extraResources, _ := sdkresource.New(
		ctx,
		sdkresource.WithOS(),
		sdkresource.WithProcess(),
		sdkresource.WithContainer(),
		sdkresource.WithHost(),
		sdkresource.WithAttributes(
			// semconv.SchemaURL,
			semconv.ServiceName(serviceName)),
	)
	resource, _ := sdkresource.Merge(
		sdkresource.Default(),
		extraResources,
	)

	lp, err := initLogger(ctx, resource, serviceName, protocol)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := lp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down logger provider: %v", err)
		}
	}()

	tp, err := initTracer(ctx, resource, protocol)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	mp, err := initMeter(ctx, resource, protocol)
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

	router := setupRouter(serviceName)

	port := os.Getenv("EXPOSE_PORT")
	if len(port) == 0 {
		port = "8888"
	}
	logger.Info("Starting server")
	router.Run(fmt.Sprintf(":%s", port))
}
