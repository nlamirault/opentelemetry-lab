// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// swift-tools-version:6.0
import PackageDescription

let package: Package = Package(
  name: "otel-swift",
  platforms: [
    .macOS(.v13)
  ],
  dependencies: [
    .package(url: "https://github.com/apple/swift-log", from: "1.6.0"),
    .package(url: "https://github.com/xcode-actions/json-logger.git", from: "1.0.0"),
    .package(url: "https://github.com/vapor/vapor.git", from: "4.117.0"),
    .package(url: "https://github.com/apple/swift-nio.git", from: "2.82.2"),
    .package(url: "https://github.com/grpc/grpc-swift.git", from: "1.26.1"),
    .package(url: "https://github.com/open-telemetry/opentelemetry-swift-core", from: "2.1.0"),
    .package(url: "https://github.com/open-telemetry/opentelemetry-swift", from: "2.1.0"),
  ],
  targets: [
    .executableTarget(
      name: "App",
      dependencies: [
        .product(name: "Logging", package: "swift-log"),
        .product(name: "JSONLogger", package: "json-logger"),
        .product(name: "Vapor", package: "vapor"),
        .product(name: "NIOCore", package: "swift-nio"),
        .product(name: "NIOPosix", package: "swift-nio"),
        .product(name: "GRPC", package: "grpc-swift"),
        .product(name: "BaggagePropagationProcessor", package: "opentelemetry-swift"),
        .product(name: "OpenTelemetryApi", package: "opentelemetry-swift-core"),
        .product(name: "OpenTelemetrySdk", package: "opentelemetry-swift-core"),
        .product(name: "OpenTelemetryProtocolExporter", package: "opentelemetry-swift"),
        .product(name: "OpenTelemetryProtocolExporterHTTP", package: "opentelemetry-swift"),
        .product(name: "OTelSwiftLog", package: "opentelemetry-swift"),
        .product(name: "PersistenceExporter", package: "opentelemetry-swift"),
        .product(name: "ResourceExtension", package: "opentelemetry-swift"),
        .product(name: "StdoutExporter", package: "opentelemetry-swift-core"),
      ],
      swiftSettings: swiftSettings
    ),
    .testTarget(
      name: "AppTests",
      dependencies: [
        .target(name: "App"),
        .product(name: "XCTVapor", package: "vapor"),
      ],
      swiftSettings: swiftSettings
    ),
  ],
  swiftLanguageModes: [.v5]
)

var swiftSettings: [SwiftSetting] {
  [
    // .enableUpcomingFeature("DisableOutwardActorInference"),
    // .enableExperimentalFeature("StrictConcurrency"),
  ]
}
