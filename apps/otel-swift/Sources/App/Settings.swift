// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Foundation

internal let runtimeVersion: String = ProcessInfo().operatingSystemVersionString

struct Instrumentation {
    static let instrumentationVersion: String = "semver:0.1.0"
}

