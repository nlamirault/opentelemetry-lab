plugins {
    // Plugin Java
    id("java")

    // Plugin Spring Boot
    id("org.springframework.boot") version "3.3.4"

    // Plugin pour gérer les dépendances Spring Boot
    id("io.spring.dependency-management") version "1.1.6"
}

group = "xyz.lamirault.otel.app"
version = "1.0.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Web Starter
    implementation("org.springframework.boot:spring-boot-starter-web")

    implementation("org.apache.logging.log4j:log4j-api:2.25.1")
    implementation("org.apache.logging.log4j:log4j-bom:2.25.1")
    implementation("org.apache.logging.log4j:log4j-core:2.25.1")

    implementation("org.apache.httpcomponents:httpclient")
    implementation("org.apache.httpcomponents:httpcore")
    implementation("org.apache.httpcomponents:fluent-hc:4.5.14")

    // OpenTelemetry BOM for version management
    implementation(platform("io.opentelemetry:opentelemetry-bom:1.54.0"))
    // implementation(platform("io.opentelemetry.instrumentation:opentelemetry-instrumentation-bom-alpha:2.11.0-alpha"))

    // OpenTelemetry Core
    implementation("io.opentelemetry:opentelemetry-api")
    implementation("io.opentelemetry:opentelemetry-sdk")
    implementation("io.opentelemetry:opentelemetry-sdk-extension-autoconfigure")

    // OpenTelemetry Exporters
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")
    implementation("io.opentelemetry:opentelemetry-exporter-logging")

    // OpenTelemetry Spring Boot Integration
    // implementation("io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter")

    // OpenTelemetry Instrumentation
    // implementation("io.opentelemetry.instrumentation:opentelemetry-instrumentation-annotations")
    implementation("io.opentelemetry.instrumentation:opentelemetry-log4j-appender-2.17:2.20.0-alpha")

    // Semantic Conventions
    implementation("io.opentelemetry.semconv:opentelemetry-semconv:1.37.0")

    implementation("io.prometheus:simpleclient")
    implementation("io.prometheus:simpleclient_httpserver")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
