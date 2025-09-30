// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Vapor

func routes(_ app: Application) throws {
    try RootRoutes.configure(app)
    try HealthRoutes.configure(app)
    try VersionRoutes.configure(app)
}
