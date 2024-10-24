import Vapor
import Logging
import NIOCore
import NIOPosix

// import OpenTelemetryApi
// import OpenTelemetrySdk
// import StdoutExporter
// import ResourceExtension

@main
enum Entrypoint {
    static func main() async throws {
        var env: Environment = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)
        
        let endpoint: String? = Environment.get("OTEL_EXPORTER_OTLP_ENDPOINT")
        try? OpenTelemetryLogger.instance.initialize(endpoint: endpoint)
        try? OpenTelemetryTracer.instance.initialize(endpoint: endpoint)
        try? OpenTelemetryMeter.instance.initialize(endpoint: endpoint)
        
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
