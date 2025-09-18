// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/nlamirault/otel-go/client"
)

type ServiceHandler struct {
	httpClient *client.HTTPClient
}

func NewServiceHandler() *ServiceHandler {
	return &ServiceHandler{
		httpClient: client.NewHTTPClient(),
	}
}

func (h *ServiceHandler) Chain(ctx *gin.Context) {
	slog.InfoContext(ctx, "Chain request")

	serviceOne := h.getServiceURL("TARGET_ONE_SVC", "http://localhost:9999")
	serviceTwo := h.getServiceURL("TARGET_TWO_SVC", "http://localhost:9999")

	slog.InfoContext(ctx, "Call to service", "server", serviceOne)
	if err := h.httpClient.Call(ctx, serviceOne); err != nil {
		slog.ErrorContext(ctx, "Service call fails", "service", serviceOne, "error", err.Error())
	}

	slog.InfoContext(ctx, "Call to service", "server", serviceTwo)
	if err := h.httpClient.Call(ctx, serviceTwo); err != nil {
		slog.ErrorContext(ctx, "Service call fails", "service", serviceTwo, "error", err.Error())
	}
}

func (h *ServiceHandler) getServiceURL(envVar, defaultURL string) string {
	if url := os.Getenv(envVar); url != "" {
		return url
	}
	return defaultURL
}

