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

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Health(ctx *gin.Context) {
	span := trace.SpanFromContext(ctx)
	slog.With(
		"trace_id", span.SpanContext().TraceID(),
		"span_id", span.SpanContext().SpanID(),
	).InfoContext(ctx, "Health status")
	ctx.String(http.StatusOK, "ok")
}
