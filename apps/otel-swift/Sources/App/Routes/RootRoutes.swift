// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import Vapor

struct RootRoutes {
    static func configure(_ app: Application) throws {
        let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
        
        app.get { req async in
            req.logger.info("Root handler")
            logger.log("[handller] Root", severity: .info)
            let tracer: OpenTelemetryApi.Tracer = OpenTelemetryTracer.instance.getTracer()
            let span: any Span = tracer.spanBuilder(spanName: "root").startSpan()
            span.setAttribute(key: "path", value: "root")
            span.end()
            return "OpenTelemetry Lab / Swift"
        }
    }
}