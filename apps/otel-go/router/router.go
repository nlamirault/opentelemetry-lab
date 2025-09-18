// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package router

import (
	"time"

	ginzap "github.com/gin-contrib/zap"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.uber.org/zap"

	"github.com/nlamirault/otel-go/handlers"
)

type Router struct {
	engine         *gin.Engine
	healthHandler  *handlers.HealthHandler
	appHandler     *handlers.AppHandler
	serviceHandler *handlers.ServiceHandler
}

func New(serviceName string) *Router {
	gin.DisableConsoleColor()
	gin.SetMode(gin.ReleaseMode)
	engine := gin.Default()
	engine.Use(otelgin.Middleware(serviceName))

	return &Router{
		engine:         engine,
		healthHandler:  handlers.NewHealthHandler(),
		appHandler:     handlers.NewAppHandler(),
		serviceHandler: handlers.NewServiceHandler(),
	}
}

func (r *Router) SetupRoutes() {
	r.engine.Use(ginzap.Ginzap(zap.L(), time.RFC3339, true))
	r.engine.Use(ginzap.RecoveryWithZap(zap.L(), true))
	r.engine.GET("/health", r.healthHandler.Health)
	r.engine.GET("/", r.appHandler.Root)
	r.engine.GET("/version", r.appHandler.Version)
	r.engine.GET("/chain", r.serviceHandler.Chain)
}

func (r *Router) Engine() *gin.Engine {
	return r.engine
}
