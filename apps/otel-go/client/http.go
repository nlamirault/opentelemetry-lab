// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package client

import (
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type HTTPClient struct {
	client *http.Client
}

func NewHTTPClient() *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: time.Duration(1) * time.Second,
		},
	}
}

func (h *HTTPClient) Call(ctx *gin.Context, url string) error {
	zap.L().Info("HTTP call to", zap.String("url", url))
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	zap.L().Info("Response", zap.String("status", resp.Status))
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	
	zap.L().Debug("Body", zap.String("body", string(body)))
	return nil
}