// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
)

type AppHandler struct{}

func NewAppHandler() *AppHandler {
	return &AppHandler{}
}

func (h *AppHandler) Root(ctx *gin.Context) {
	span := trace.SpanFromContext(ctx)
	slog.With(
		"trace_id", span.SpanContext().TraceID(),
		"span_id", span.SpanContext().SpanID(),
	).InfoContext(ctx, "Root")
	slog.DebugContext(ctx, "Handling request", "URI", ctx.Request.RequestURI)
	ctx.String(http.StatusOK, "OpenTelemetry Lab / Go")
}

func (h *AppHandler) Version(ctx *gin.Context) {
	span := trace.SpanFromContext(ctx)
	slog.With(
		"trace_id", span.SpanContext().TraceID(),
		"span_id", span.SpanContext().SpanID(),
	).InfoContext(ctx, "Retrieve Version")
	ctx.JSON(http.StatusOK, gin.H{"version": "v1.0.0"})
}
