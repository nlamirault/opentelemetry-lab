// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import Vapor

struct VersionResponse: Content {
    var version: String
}

struct VersionRoutes {
    static func configure(_ app: Application) throws {
        let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
        
        app.get("version") { req async -> VersionResponse in
            req.logger.info("[handler] Version")
            logger.log("Handler: version", severity: .info)
            return VersionResponse(version: "v1.0.0")
        }
    }
}