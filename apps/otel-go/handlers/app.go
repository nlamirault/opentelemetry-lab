// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

type AppHandler struct{}

func NewAppHandler() *AppHandler {
	return &AppHandler{}
}

func (h *AppHandler) Root(ctx *gin.Context) {
	span := trace.SpanFromContext(ctx)
	zap.L().Info("Handling root request",
		zap.String("trace_id", span.SpanContext().TraceID().String()),
		zap.String("span_id", span.SpanContext().SpanID().String()))
	zap.L().Info("", zap.String("URI", ctx.Request.RequestURI))
	ctx.String(http.StatusOK, "OpenTelemetry Lab / Go")
}

func (h *AppHandler) Version(ctx *gin.Context) {
	span := trace.SpanFromContext(ctx)
	zap.L().Info("Handling version request",
		zap.String("trace_id", span.SpanContext().TraceID().String()),
		zap.String("span_id", span.SpanContext().SpanID().String()))
	ctx.JSON(http.StatusOK, gin.H{"version": "v1.0.0"})
}
