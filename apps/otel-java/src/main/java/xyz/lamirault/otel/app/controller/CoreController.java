// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.controller;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.metrics.ObservableDoubleGauge;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.semconv.ResourceAttributes;
import io.opentelemetry.semconv.trace.attributes.SemanticAttributes;
import java.io.IOException;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.fluent.Request;
import org.apache.http.util.EntityUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import xyz.lamirault.otel.app.service.CoreService;

@RestController
public class CoreController {

  private final Logger logger = LogManager.getLogger(CoreService.class);
  // private final LongCounter hitsCounter;
  // private final DoubleHistogram latency;
  // private final ObservableDoubleGauge activeUsersGauge;
  // private final AtomicLong activeUsersCounter;
  private final CoreService coreService;
  private final Tracer tracer;
  private final Meter meter;

  // @Autowired
  CoreController(
    OpenTelemetry opentelemetry,
    String serviceName,
    CoreService service
  ) {
    logger.info("Starting CoreController for {}", serviceName);

    // Meter meter = openTelemetry.getMeter(CoreController.class.getName());
    // hitsCounter = meter.counterBuilder(serviceName + ".api.hits").build();
    // latency = meter.histogramBuilder(serviceName + ".task.duration").build();

    // activeUsersCounter = new AtomicLong();
    // activeUsersGauge = meter
    //   .gaugeBuilder(serviceName + ".active.users.gauge")
    //   .buildWithCallback(measurement ->
    //     measurement.record(activeUsersCounter.get())
    //   );

    coreService = service;
    tracer = opentelemetry.getTracer(serviceName);
    meter = opentelemetry.getMeter(serviceName);
  }

  @GetMapping("/")
  public String root(@RequestHeader HttpHeaders headers) {
    logger.info("[handler] root");
    logger.info(headers.toString());
    return String.format("OpenTelemetry Lab / Java");
  }

  @GetMapping("/version")
  public String version(@RequestHeader HttpHeaders headers) {
    logger.info("[handler] version");
    return String.format("{\"version\": \"v1.0.0\"}");
  }

  @GetMapping("/health")
  public String health(@RequestHeader HttpHeaders headers) {
    logger.info("[handler] health");
    return String.format("{\"status\": \"ok\"}");
  }

  @GetMapping("/chain")
  public String chain(
    @RequestParam(value = "name", defaultValue = "World") String name
  ) throws InterruptedException, IOException {
    logger.info("[handler] chain");

    var span = tracer.spanBuilder("chain_request").startSpan();

    try {
      HttpResponse response = Request.Get("https://api.ipify.org?format=json")
        .execute()
        .returnResponse();
      int statusCode = response.getCode();
      String body = EntityUtils.toString(response.getEntity());

      span.setAttribute(ResourceAttributes.HTTP_METHOD, "GET");
      // span.setAttribute(SemanticAttributes.HTTP_METHOD, "GET");
      span.setAttribute(
        // SemanticAttributes.HTTP_URL,
        ResourceAttributes.HTTP_URL,
        "https://api.ipify.org?format=json"
      );
      // span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, statusCode);
      span.setAttribute(ResourceAttributes.HTTP_STATUS_CODE, statusCode);

      logger.info("Response content" + body);
    } catch (ClientProtocolException e) {
      span.setStatus(StatusCode.ERROR, e.getMessage());
    } catch (IOException e) {
      span.setStatus(StatusCode.ERROR, e.getMessage());
    } catch (Exception e) {
      span.setStatus(StatusCode.ERROR, e.getMessage());
    }
    // try {
    //   chain.doFilter(request, response);
    // } catch (Throwable t) {
    //   span.setStatus(StatusCode.ERROR, t.getMessage());
    //   span.recordException(
    //     t,
    //     Attributes.of(SemanticAttributes.EXCEPTION_ESCAPED, true)
    //   );
    // }

    // String TARGET_ONE_SVC = System.getenv("TARGET_ONE_SVC");
    // Request.Get("http://localhost:8080/").execute().returnContent();

    // Request.Get(String.format("http://%s/io_task", TARGET_ONE_SVC))
    //   .execute()
    //   .returnContent();

    // String TARGET_TWO_SVC = System.getenv("TARGET_TWO_SVC");
    // Request.Get(String.format("http://%s/cpu_task", TARGET_TWO_SVC))
    //   .execute()
    //   .returnContent();

    logger.debug("chain is finished");
    return "chain";
  }

  @GetMapping("/error_test")
  public String error_test(
    @RequestParam(value = "name", defaultValue = "World") String name
  ) throws Exception {
    throw new Exception("Error test");
  }
}
