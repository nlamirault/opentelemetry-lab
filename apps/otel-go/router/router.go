// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package router

import (
	"net/http"
	"slices"
	"time"

	ginzap "github.com/gin-contrib/zap"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"

	"github.com/nlamirault/otel-go/handlers"
)

// Health checks and Prometheus scrapes are neither traced nor access logged.
var skipPaths = []string{"/health", "/metrics"}

type Router struct {
	engine         *gin.Engine
	healthHandler  *handlers.HealthHandler
	appHandler     *handlers.AppHandler
	serviceHandler *handlers.ServiceHandler
	metricsHandler *handlers.MetricsHandler
}

func New(serviceName string) *Router {
	gin.DisableConsoleColor()
	gin.SetMode(gin.ReleaseMode)
	// gin.New instead of gin.Default: access logs and panic recovery are
	// handled by ginzap in SetupRoutes.
	engine := gin.New()
	engine.Use(otelgin.Middleware(serviceName, otelgin.WithFilter(func(req *http.Request) bool {
		return !slices.Contains(skipPaths, req.URL.Path)
	})))

	return &Router{
		engine:         engine,
		healthHandler:  handlers.NewHealthHandler(),
		appHandler:     handlers.NewAppHandler(),
		serviceHandler: handlers.NewServiceHandler(),
		metricsHandler: handlers.NewMetricsHandler(),
	}
}

func (r *Router) SetupRoutes() {
	r.engine.Use(ginzap.GinzapWithConfig(zap.L(), &ginzap.Config{
		TimeFormat: time.RFC3339,
		UTC:        true,
		SkipPaths:  skipPaths,
	}))
	r.engine.Use(ginzap.RecoveryWithZap(zap.L(), true))
	r.engine.GET("/", r.appHandler.Root)
	r.engine.GET("/chain", r.serviceHandler.Chain)
	r.engine.GET("/health", r.healthHandler.Health)
	r.engine.GET("/metrics", r.metricsHandler.Metrics)
	r.engine.GET("/version", r.appHandler.Version)
}

func (r *Router) Engine() *gin.Engine {
	return r.engine
}
