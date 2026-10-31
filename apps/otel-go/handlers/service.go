// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"errors"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"

	"github.com/nlamirault/otel-go/client"
	"github.com/nlamirault/otel-go/httperr"
)

type ServiceHandler struct {
	httpClient *client.HTTPClient
}

func NewServiceHandler() *ServiceHandler {
	return &ServiceHandler{
		httpClient: client.NewHTTPClient(),
	}
}

// Chain calls both target services, and answers 502 Bad Gateway if any of
// them fails.
func (h *ServiceHandler) Chain(ctx *gin.Context) {
	zap.L().Info("Chain request")

	serviceOne := h.getServiceURL("TARGET_ONE_SVC", "http://localhost:9999")
	serviceTwo := h.getServiceURL("TARGET_TWO_SVC", "http://localhost:9999")

	var errs []error
	for _, service := range []string{serviceOne, serviceTwo} {
		zap.L().Info("Call to service", zap.String("server", service))
		if err := h.httpClient.Call(ctx, service); err != nil {
			zap.L().Error("Service call fails", zap.String("service", service), zap.Error(err))
			errs = append(errs, err)
		}
	}
	if err := errors.Join(errs...); err != nil {
		httperr.HandleBadGateway(err, trace.SpanFromContext(ctx.Request.Context()), ctx)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"path": "/chain"})
}

func (h *ServiceHandler) getServiceURL(envVar, defaultURL string) string {
	if url := os.Getenv(envVar); url != "" {
		return url
	}
	return defaultURL
}
