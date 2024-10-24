// Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"io/ioutil"
	"log/slog"
	"net/http"
)

func httpCall(client http.Client, url string) error {
	slog.Info("HTTP call to", "url", url)
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	slog.Info("Response", "status", resp.Status)
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	slog.Debug("Body", body)
	return nil
}
