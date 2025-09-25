import GRPC
import NIOPosix
import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetryProtocolExporterGrpc
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk
import StdoutExporter
import Vapor


class OpenTelemetryTracer {
    static let instance: OpenTelemetryTracer = OpenTelemetryTracer()

    private init() {}

    private var isInitialized = false

    func initialize(endpoint: String?) throws -> Void {
        guard isInitialized == false else { return }
        isInitialized = true

        let otlpTracesConfig: OtlpConfiguration = OtlpConfiguration(
            timeout: OtlpConfiguration.DefaultTimeoutInterval
            // headers: [
            //     ("Authentication","xxxxxx")
            // ]
        )

        var traceExporter: SpanExporter
        let otelProtocol: String? = Environment.get("OTEL_EXPORTER_OTLP_PROTOCOL")
        switch otelProtocol {
        case "grpc":
            guard let endpointURL: URL = URL(string: endpoint ?? "http://localhost:4317"), let host: String = endpointURL.host, let port: Int = endpointURL.port else {
                throw OpenTelemetryError.invalidHost
            }
            let configuration: ClientConnection.Configuration = ClientConnection.Configuration.default(
                target: .hostAndPort(host, port),
                eventLoopGroup: MultiThreadedEventLoopGroup(numberOfThreads: 1)
            )
            let grpcChannel: ClientConnection = ClientConnection(configuration: configuration)
            traceExporter = OtlpTraceExporter(channel: grpcChannel, config: otlpTracesConfig)

        case "http":
            let endpointURL: URL? = URL(string: endpoint ?? "http://localhost:4318")
            guard let endpointURL: URL = endpointURL else {
                throw AppError.Bind(message: "invalid OpenTelemetry HTTP endpoint")
            }
            traceExporter = OtlpHttpTraceExporter(
                endpoint: endpointURL,
                config: otlpTracesConfig
            )
        default:
            throw OpenTelemetryError.invalidProtocol
        }

        let stdoutExporter: StdoutSpanExporter = StdoutSpanExporter()
        let spanExporter: MultiSpanExporter = MultiSpanExporter(spanExporters: [traceExporter, stdoutExporter])
        let tracerProvider: TracerProviderSdk = TracerProviderBuilder()
            .add(spanProcessor: BatchSpanProcessor(spanExporter: spanExporter))
            // .add(spanProcessor: [
            //     BatchSpanProcessor(spanExporter: traceExporter),
            //     SimpleSpanProcessor(spanExporter: stdoutExporter)])
            .with(resource: OTelResourceProvider().getResource())
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }

    func getTracer() -> OpenTelemetryApi.Tracer {
        return OpenTelemetry.instance.tracerProvider.get(
            instrumentationName: Constants.applicationName,
            instrumentationVersion: Instrumentation.instrumentationVersion
        )
    }
}
