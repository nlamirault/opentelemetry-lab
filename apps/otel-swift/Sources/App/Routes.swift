import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import Vapor

struct VersionResponse: Content {
  var version: String
}

func routes(_ app: Application) throws {

  app.get { req async in
    req.logger.info("Root handler")
    let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
    logger.log("[handller] Root", severity: .info)
    let tracer: OpenTelemetryApi.Tracer = OpenTelemetryTracer.instance.getTracer()
    let span: any Span = tracer.spanBuilder(spanName: "root").startSpan()
    span.setAttribute(key: "path", value: "root")
    span.end()
    return "OpenTelemetry Lab / Swift"
  }

  app.get("health") { req async -> String in
    req.logger.info("[handler] Health")
    let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
    logger.log("Handler: health", severity: .info)
    return "Ok"
  }

  app.get("version") { req async -> VersionResponse in
    req.logger.info("[handler] Version")
    let logger: OpenTelemetryApi.Logger = OpenTelemetryLogger.instance.getLogger()
    logger.log("Handler: health", severity: .info)
    return VersionResponse(version: "v1.0.0")
  }
}
