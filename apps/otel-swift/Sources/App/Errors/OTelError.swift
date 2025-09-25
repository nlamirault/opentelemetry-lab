// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

enum OpenTelemetryError: String, Error {
    case invalidHost = "Host is invalid"
    case invalidProtocol = "Protocol is invalid"
}
