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
            ResourceAttributes.serviceName.rawValue: AttributeValue.string(serviceName),
            ResourceAttributes.telemetrySdkName.rawValue: AttributeValue.string("opentelemetry"),
            ResourceAttributes.telemetrySdkLanguage.rawValue: AttributeValue.string("swift"),
            ResourceAttributes.telemetrySdkVersion.rawValue: AttributeValue.string(Resource.OTEL_SWIFT_SDK_VERSION)
        ])
        let defaultResources: Resource = DefaultResources().get()
        return defaultResources.merging(other: customResource)
    }
}
