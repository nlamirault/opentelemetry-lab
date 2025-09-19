# OpenTelemetry Lab / Java

A Spring Boot application demonstrating OpenTelemetry integration with traces, metrics, and logs.

## Prerequisites

- Java 8 or higher
- Gradle 7.0+
- Docker (for containerized builds/runs)

## Build

### Local Build

```bash
# Clean and compile
gradle clean compileJava

# Build JAR package
gradle clean build

# Skip tests during build
gradle clean build -x test
```

### Docker Build

```bash
# Using Makefile (from project root)
make docker-build APP=otel-java

# Direct docker build
docker build -t otel-java .
```

## Run

### Local Run

```bash
# Run with Gradle
gradle bootRun

# Run JAR directly
java -jar build/libs/otel-java-1.0.0-SNAPSHOT.jar

# Run with OpenTelemetry Java agent (if available)
java -javaagent:path/to/opentelemetry-javaagent.jar \
     -jar build/libs/otel-java-1.0.0-SNAPSHOT.jar
```

### Docker Run

```bash
# Using Makefile (from project root)
make docker-run APP=otel-java

# Direct docker run
docker run -p 8080:8080 otel-java
```

### Environment Variables

- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP endpoint URL
- `OTEL_EXPORTER_OTLP_PROTOCOL`: OTLP protocol
- `OTEL_SERVICE_NAME`: Service name for telemetry
- `OTEL_RESOURCE_ATTRIBUTES`: Additional resource attributes

## Test

```bash
# Run all tests
gradle test

# Run tests with coverage
gradle test jacocoTestReport

# Run integration tests
gradle check

# Run specific test class
gradle test --tests CoreControllerTest
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - Application metrics
- Additional endpoints available in CoreController

## Documentation

- [OpenTelemetry Java Documentation](https://javadoc.io/doc/io.opentelemetry)
- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
