// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package errors

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/codes"
	oteltrace "go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

func HandleBadRequest(err error, span oteltrace.Span, ctx *gin.Context) {
	HandleHTTPError(err, span, ctx, http.StatusBadRequest)
}

func HandleInternalServerError(err error, span oteltrace.Span, ctx *gin.Context) {
	HandleHTTPError(err, span, ctx, http.StatusInternalServerError)
}

func HandleUnauthorized(err error, span oteltrace.Span, ctx *gin.Context) {
	HandleHTTPError(err, span, ctx, http.StatusUnauthorized)
}

func HandleHTTPError(err error, span oteltrace.Span, ctx *gin.Context, status int) {
	zap.L().Error("HTTP error occurred", zap.Error(err), zap.Int("status", status))
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())
	ctx.JSON(status, gin.H{"error": err.Error()})
}