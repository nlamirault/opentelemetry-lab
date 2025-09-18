// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package client

import (
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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
	slog.InfoContext(ctx, "HTTP call to", "url", url)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	slog.InfoContext(ctx, "Response", "status", resp.Status)
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	
	slog.DebugContext(ctx, "Body", "body", string(body))
	return nil
}