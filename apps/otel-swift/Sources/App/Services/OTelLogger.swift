import GRPC
import NIOPosix
import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetryProtocolExporterGrpc
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk
// import StdoutExporter
import Vapor


class OpenTelemetryLogger {
    static let instance: OpenTelemetryLogger = OpenTelemetryLogger()

    private init() {}

    private var isInitialized: Bool = false

    func initialize(endpoint: String?) throws -> Void {
        guard isInitialized == false else { return }
        isInitialized = true

        let otlpLogsConfig: OtlpConfiguration = OtlpConfiguration(
            timeout: OtlpConfiguration.DefaultTimeoutInterval
            // headers: [
            //     ("Authentication","xxxxxx")
            // ]
        )

        var logExporter: LogRecordExporter
        let otelProtocol: String? = Environment.get("OTEL_LOGS_EXPORTER")
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
            logExporter = OtlpLogExporter(channel: grpcChannel, config: otlpLogsConfig)
        case "http":
            let endpointURL: URL? = URL(string: endpoint ?? "http://localhost:4318")
            guard let endpointURL: URL = endpointURL else {
                throw AppError.Bind(message: "invalid OpenTelemetry HTTP endpoint")
            }
            logExporter = OtlpHttpLogExporter(
                endpoint: endpointURL,
                config: otlpLogsConfig
            )
        default:
            throw OpenTelemetryError.invalidProtocol
        }

        // let stdoutExporter: StdoutLogExporter = StdoutLogExporter()

        // let logProcessor = SimpleLogRecordProcessor(logRecordExporter: logExporter)
        let logProcessor: BatchLogRecordProcessor = BatchLogRecordProcessor(logRecordExporter: logExporter)
        let loggerProvider: LoggerProviderSdk = LoggerProviderBuilder()
            .with(processors: [logProcessor])
            .with(resource: OTelResourceProvider().getResource())
            .build()

        OpenTelemetry.registerLoggerProvider(loggerProvider: loggerProvider)
    }

    func getLogger() -> OpenTelemetryApi.Logger {
        return OpenTelemetry.instance.loggerProvider.loggerBuilder(
            instrumentationScopeName: Constants.applicationName // Instrumentation.instrumentationScopeName
            // instrumentationVersion: Instrumentation.instrumentationVersion
        ).setEventDomain("ios-device").build()
    }
}

extension OpenTelemetryApi.Logger {
    func log(
        _ message: String,
        severity: Severity,
        timestamp: Date = Date(),
        attributes: [String: String] = [:]
    ) {
        let otelAttributes = attributes.reduce(into: [String: AttributeValue]()) {
            $0[$1.key] = AttributeValue.string($1.value)
        }
        self
            .logRecordBuilder()
            .setBody(AttributeValue.string(message))
            .setTimestamp(timestamp)
            .setAttributes(otelAttributes)
            .setSeverity(severity)
            .emit()
    }
}
