// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func rootHandler(ctx *gin.Context) {
	slog.InfoContext(ctx, "Root")
	slog.DebugContext(ctx, "Handling request", "URI", ctx.Request.RequestURI)
	ctx.String(http.StatusOK, "OpenTelemetry Lab / Go")
}

func versionHandler(ctx *gin.Context) {
	slog.InfoContext(ctx, "Retrieve Version")
	ctx.JSON(http.StatusOK, gin.H{"version": "v1.0.0"})
}

func chainHandler(ctx *gin.Context) {
	slog.InfoContext(ctx, "Chain request")

	serviceOne := "http://localhost:9999"
	if os.Getenv("TARGET_ONE_SVC") != "" {
		serviceOne = os.Getenv("TARGET_ONE_SVC")
	}
	serviceTwo := "http://localhost:9999"
	if os.Getenv("TARGET_TWO_SVC") != "" {
		serviceTwo = os.Getenv("TARGET_TWO_SVC")
	}

	client := http.Client{Timeout: time.Duration(1) * time.Second}

	slog.InfoContext(ctx, "Call to service", "server", serviceOne)
	if err := httpCall(client, serviceOne); err != nil {
		slog.ErrorContext(ctx, "Service call fails", "service", serviceOne, "error", err.Error())
	}

	slog.InfoContext(ctx, "Call to service", "server", serviceTwo)
	if err := httpCall(client, serviceTwo); err != nil {
		slog.ErrorContext(ctx, "Service call fails", "service", serviceTwo, "error", err.Error())
	}
}
