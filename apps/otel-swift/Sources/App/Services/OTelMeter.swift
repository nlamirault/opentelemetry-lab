import GRPC
import NIOPosix
import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetryProtocolExporterGrpc
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk
import StdoutExporter
import Vapor

class OpenTelemetryMeter {
  static let instance: OpenTelemetryMeter = OpenTelemetryMeter()

  private init() {}

  private var isInitialized = false

  func initialize(endpoint: String?) throws {
    guard isInitialized == false else { return }
    isInitialized = true

    let otlpMetricsConfig: OtlpConfiguration = OtlpConfiguration(
      timeout: OtlpConfiguration.DefaultTimeoutInterval
        // headers: [
        //     ("Authentication","xxxxxx")
        // ]
    )

    var metricExporter: MetricExporter
    let otelProtocol: String? = Environment.get("OTEL_EXPORTER_OTLP_PROTOCOL")
    switch otelProtocol {
    case "grpc":
      guard let endpointURL: URL = URL(string: endpoint ?? "http://localhost:4317"),
        let host: String = endpointURL.host, let port: Int = endpointURL.port
      else {
        throw OpenTelemetryError.invalidHost
      }
      let configuration: ClientConnection.Configuration = ClientConnection.Configuration.default(
        target: .hostAndPort(host, port),
        eventLoopGroup: MultiThreadedEventLoopGroup(numberOfThreads: 1)
      )
      let grpcChannel: ClientConnection = ClientConnection(configuration: configuration)
      metricExporter = OtlpMetricExporter(channel: grpcChannel, config: otlpMetricsConfig)

    case "http":
      let endpointURL: URL? = URL(string: endpoint ?? "http://localhost:4318")
      guard let endpointURL: URL = endpointURL else {
        throw AppError.Bind(message: "invalid OpenTelemetry HTTP endpoint")
      }
      metricExporter = OtlpHttpMetricExporter(
        endpoint: endpointURL,
        config: otlpMetricsConfig
      )
    default:
      throw OpenTelemetryError.invalidProtocol
    }

    let metricReader = PeriodicMetricReaderBuilder(exporter: metricExporter).build()
    let meterProvider = MeterProviderSdk.builder()
      .registerMetricReader(reader: metricReader)
      .setResource(resource: OTelResourceProvider().getResource())
      .build()
    // let meterProvider: any MeterProvider = MeterProviderBuilder()
    //   .with(processor: MetricProcessorSdk())
    //   .with(exporter: metricExporter)
    //   .with(resource: OTelResourceProvider().getResource())
    //   .build()

    OpenTelemetry.registerMeterProvider(meterProvider: meterProvider)
  }

  func getMeter() -> any OpenTelemetryApi.Meter {
    return OpenTelemetry.instance.meterProvider.get(
      name: Constants.applicationName
    )
  }
}
