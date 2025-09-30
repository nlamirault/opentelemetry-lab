// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import Vapor

struct HealthRoutes {
    static func configure(_ app: Application) throws {
        let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
        
        app.get("health") { req async -> String in
            req.logger.info("[handler] Health")
            logger.log("Handler: health", severity: .info)
            return "Ok"
        }
    }
}