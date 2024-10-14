import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import Vapor

func routes(_ app: Application) throws {

    app.get { req async in
        req.logger.info("Root handler")
        let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
        logger.log("Hander: root", severity: .info)
        let tracer: OpenTelemetryApi.Tracer = OpenTelemetryTracer.instance.getTracer()
        let span: any Span = tracer.spanBuilder(spanName: "root").startSpan()
            span.setAttribute(key: "path", value: "root")
            span.end()
        return Constants.applicationName
    }

    app.get("health") { req async -> String in
        req.logger.info("Health handler")
        let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
        logger.log("Hander: health", severity: .info)
        return "Ok"
    }
}
