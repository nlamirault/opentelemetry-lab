// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package handlers

import (
	"os"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

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
	zap.L().Info("Chain request")

	serviceOne := h.getServiceURL("TARGET_ONE_SVC", "http://localhost:9999")
	serviceTwo := h.getServiceURL("TARGET_TWO_SVC", "http://localhost:9999")

	zap.L().Info("Call to service", zap.String("server", serviceOne))
	if err := h.httpClient.Call(ctx, serviceOne); err != nil {
		zap.L().Error("Service call fails", zap.String("service", serviceOne), zap.Error(err))
	}

	zap.L().Info("Call to service", zap.String("server", serviceTwo))
	if err := h.httpClient.Call(ctx, serviceTwo); err != nil {
		zap.L().Error("Service call fails", zap.String("service", serviceTwo), zap.Error(err))
	}
}

func (h *ServiceHandler) getServiceURL(envVar, defaultURL string) string {
	if url := os.Getenv(envVar); url != "" {
		return url
	}
	return defaultURL
}

