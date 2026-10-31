// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package version

// Version of the application. Override it at build time with:
//
//	go build -ldflags "-X github.com/nlamirault/otel-go/version.Version=v1.2.3"
var Version = "v1.0.0"
