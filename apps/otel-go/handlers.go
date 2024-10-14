# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func rootHandler(ctx *gin.Context) {
	if len(ctx.Query("fail")) > 0 {
		ctx.String(http.StatusInternalServerError, "An error occurs")
		return
	}
	slog.Debug("Handling request", "URI", ctx.Request.RequestURI)
	version := os.Getenv("VERSION")
	output := os.Getenv("MESSAGE")
	if len(output) == 0 {
		output = "This is a silly demo"
	}
	if len(version) > 0 {
		output = fmt.Sprintf("%s version %s", output, version)
	}
	if len(ctx.Query("html")) > 0 {
		output = fmt.Sprintf("<h1>%s</h1>", output)
	}
	output = fmt.Sprintf("%s\n", output)
	ctx.String(http.StatusOK, output)
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