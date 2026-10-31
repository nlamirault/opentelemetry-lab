// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type MetricsHandler struct {
	handler http.Handler
}

func NewMetricsHandler() *MetricsHandler {
	return &MetricsHandler{
		handler: promhttp.Handler(),
	}
}

func (h *MetricsHandler) Metrics(ctx *gin.Context) {
	h.handler.ServeHTTP(ctx.Writer, ctx.Request)
}
