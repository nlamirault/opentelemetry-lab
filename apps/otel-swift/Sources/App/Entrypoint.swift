// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Logging
import NIOCore
import NIOPosix
import OpenTelemetryApi
import OpenTelemetrySdk
import ResourceExtension
import StdoutExporter
import Vapor

@main
enum Entrypoint {
  static func main() async throws {
    var env: Environment = try Environment.detect()
    try LoggingSystem.bootstrap(from: &env)

    let endpoint: String? = Environment.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    try? OpenTelemetryLogger.instance.initialize(endpoint: endpoint)
    try? OpenTelemetryTracer.instance.initialize(endpoint: endpoint)
    try? OpenTelemetryMeter.instance.initialize(endpoint: endpoint)

    // Create build info metric
    let serviceName = Environment.get("OTEL_SERVICE_NAME") ?? "otel-swift"
    let meter = OpenTelemetryMeter.instance.getMeter()
    var buildInfo = meter.counterBuilder(name: Constants.metricBuildInfo).build()
    buildInfo.add(
      value: 1,
      attributes: [
        SemanticConventions.Telemetry.sdkLanguage.rawValue: AttributeValue.string("swift"),
        SemanticConventions.Service.name.rawValue: AttributeValue.string(serviceName),
        SemanticConventions.Service.version.rawValue: AttributeValue.string("v1.0.0"),
      ])

    let app: Application = try await Application.make(env)

    do {
      try await configure(app)
    } catch {
      app.logger.report(error: error)
      try? await app.asyncShutdown()
      throw error
    }
    try await app.execute()
    try await app.asyncShutdown()
  }
}
