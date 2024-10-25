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
	slog.Info("[handler] Root")
	slog.Debug("Handling request", "URI", ctx.Request.RequestURI)
	ctx.String(http.StatusOK, "OpenTelemetry Lab / Go")
}

func versionHandler(ctx *gin.Context) {
	slog.Info("[handler] Version")
	ctx.JSON(http.StatusOK, gin.H{"version": "v1.0.0"})
}

func chainHandler(ctx *gin.Context) {
	serviceOne := "http://localhost:9999"
	if os.Getenv("TARGET_ONE_SVC") != "" {
		serviceOne = os.Getenv("TARGET_ONE_SVC")
	}
	serviceTwo := "http://localhost:9999"
	if os.Getenv("TARGET_TWO_SVC") != "" {
		serviceTwo = os.Getenv("TARGET_TWO_SVC")
	}

	client := http.Client{Timeout: time.Duration(1) * time.Second}
	if err := httpCall(client, serviceOne); err != nil {
		slog.Error(err.Error())
	}
	if err := httpCall(client, serviceTwo); err != nil {
		slog.Error(err.Error())
	}
}
