// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import GRPC
import Logging
import NIOPosix
import OTelSwiftLog
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

  func initialize(endpoint: String?) throws {
    guard isInitialized == false else { return }
    isInitialized = true

    let otlpLogsConfig: OtlpConfiguration = OtlpConfiguration(
      timeout: OtlpConfiguration.DefaultTimeoutInterval
        // headers: [
        //     ("Authentication","xxxxxx")
        // ]
    )

    var logExporter: LogRecordExporter
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
    let logProcessor: BatchLogRecordProcessor = BatchLogRecordProcessor(
      logRecordExporter: logExporter)
    let loggerProvider: LoggerProviderSdk = LoggerProviderBuilder()
      .with(processors: [logProcessor])
      .with(resource: OTelResourceProvider().getResource())
      .build()

    let otelLogHandler = OTelLogHandler(loggerProvider: loggerProvider)

    // LoggingSystem.bootstrap { label in
    //   JSONLogHandler(label: label)
    // }

    var logger = Logger(label: Constants.applicationName)
    logger.logLevel = .debug
    logger.handler = otelLogHandler

    logger.info(
      "OpenTelemetry log configuration done",
      metadata: ["application": .string(Constants.applicationName)])

    OpenTelemetry.registerLoggerProvider(loggerProvider: loggerProvider)
  }

  func getLogger() -> OpenTelemetryApi.Logger {
    return OpenTelemetry.instance.loggerProvider.loggerBuilder(
      instrumentationScopeName: Constants.applicationName  // Instrumentation.instrumentationScopeName
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

// struct JSONLogHandler: LogHandler {
//   var logLevel: Logging.Logger.Level = .info
//   var metadata: Logging.Logger.Metadata = [:]
//   let label: String

//   init(label: String) {
//     self.label = label
//   }

//   subscript(metadataKey key: String) -> Logging.Logger.Metadata.Value? {
//     get { metadata[key] }
//     set { metadata[key] = newValue }
//   }

//   func log(
//     level: Logging.Logger.Level,
//     message: Logging.Logger.Message,
//     metadata: Logging.Logger.Metadata?,
//     source: String,
//     file: String,
//     function: String,
//     line: UInt
//   ) {

//     var mergedMetadata = self.metadata
//     if let metadata = metadata {
//       mergedMetadata.merge(metadata, uniquingKeysWith: { $1 })
//     }

//     let json: [String: Any] = [
//       "timestamp": ISO8601DateFormatter().string(from: Date()),
//       "level": level.rawValue,
//       "label": label,
//       "message": message.description,
//       "metadata": mergedMetadata,
//       "source": source,
//       "file": file,
//       "function": function,
//       "line": line,
//     ]

//     if let data = try? JSONSerialization.data(withJSONObject: json, options: []),
//       let jsonString = String(data: data, encoding: .utf8)
//     {
//       print(jsonString)
//     }
//   }
// }
