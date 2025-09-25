// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import Foundation
import GRPC
import NIOPosix
import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetryProtocolExporterGrpc
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk
import ResourceExtension
import StdoutExporter
import Vapor

struct OTelResourceProvider {
  let serviceName: String = Environment.get("OTEL_SERVICE_NAME") ?? "otel-swift"
  func getResource() -> Resource {
    let customResource: Resource = Resource.init(attributes: [
      SemanticConventions.Service.name.rawValue: AttributeValue.string(serviceName),
      SemanticConventions.Service.version.rawValue: AttributeValue.string("1.0.0"),
      SemanticConventions.Telemetry.distroName.rawValue: AttributeValue.string("swift"),
      SemanticConventions.Telemetry.sdkName.rawValue: AttributeValue.string("opentelemetry"),
      SemanticConventions.Telemetry.sdkVersion.rawValue: AttributeValue.string(
        Resource.OTEL_SWIFT_SDK_VERSION),
    ])
    let defaultResources: Resource = DefaultResources().get()
    return defaultResources.merging(other: customResource)
  }

}
