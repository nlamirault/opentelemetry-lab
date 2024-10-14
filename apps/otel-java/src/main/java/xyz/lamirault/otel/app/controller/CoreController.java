# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.controller;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.client.fluent.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import io.opentelemetry.api.metrics.ObservableDoubleGauge;

import xyz.lamirault.otel.app.service.CoreService;

@RestController
public class CoreController {
    private final Logger logger = LoggerFactory.getLogger(CoreController.class);
    private final LongCounter hitsCounter;
    private final DoubleHistogram latency;
    private final ObservableDoubleGauge activeUsersGauge;
    private final AtomicLong activeUsersCounter;
    private final CoreService coreService;

    @Autowired
    CoreController(OpenTelemetry openTelemetry, String serviceName, CoreService service) {
        logger.info("Starting CoreController for {}", serviceName);
        
        Meter meter = openTelemetry.getMeter(CoreController.class.getName());
        hitsCounter = meter.counterBuilder(serviceName + ".api.hits").build();
        latency = meter.histogramBuilder(serviceName + ".task.duration").build();
        
        activeUsersCounter = new AtomicLong();
        activeUsersGauge = meter.gaugeBuilder(serviceName + ".active.users.gauge").buildWithCallback(measurement -> measurement.record(activeUsersCounter.get()));
        
        coreService = service;
    }

    @GetMapping("/")
    public String root(@RequestParam(value = "name", defaultValue = "World") String name, @RequestHeader HttpHeaders headers) {
        logger.warn(headers.toString());
        logger.info(String.format("Hello %s!!", name));
        return String.format("Hello %s!!", name);
    }

    @GetMapping("/core")
    public String getDate(@RequestHeader MultiValueMap<String, String> headers) {
        long startTime = System.currentTimeMillis();
        activeUsersCounter.incrementAndGet();
        
        try {
            hitsCounter.add(1);
            String output = coreService.getDate();
            return output;
            
        } finally {
            long endTime = System.currentTimeMillis();
            latency.record(endTime - startTime);
            activeUsersCounter.decrementAndGet();
        }
    }

    @GetMapping("/io_task")
    public String io_task(@RequestParam(value = "name", defaultValue = "World") String name) throws InterruptedException {
        Thread.sleep(1000);
        logger.info("io_task");
        return "io_task";
    }

    @GetMapping("/cpu_task")
    public String cpu_task(@RequestParam(value = "name", defaultValue = "World") String name) {
        for (int i = 0; i < 100; i++) {
            int tmp = i * i * i;
        }
        logger.info("cpu_task");
        return "cpu_task";
    }

    @GetMapping("/random_sleep")
    public String random_sleep(@RequestParam(value = "name", defaultValue = "World") String name) throws InterruptedException {
        Thread.sleep((int) (Math.random() / 5 * 10000));
        logger.info("random_sleep");
        return "random_sleep";
    }

    @GetMapping("/random_status")
    public String random_status(@RequestParam(value = "name", defaultValue = "World") String name, HttpServletResponse response) throws InterruptedException {
        List<Integer> givenList = Arrays.asList(200, 200, 300, 400, 500);
        Random rand = new Random();
        int randomElement = givenList.get(rand.nextInt(givenList.size()));
        response.setStatus(randomElement);
        logger.info("random_status");
        return "random_status";
    }

    @GetMapping("/chain")
    public String chain(@RequestParam(value = "name", defaultValue = "World") String name) throws InterruptedException, IOException {
        String TARGET_ONE_SVC = System.getenv().getOrDefault("TARGET_ONE_SVC", "http://localhost:8080");
        String TARGET_TWO_SVC = System.getenv().getOrDefault("TARGET_TWO_SVC", "http://localhost:8080");
        logger.debug(String.format("chain is starting for %s %s", TARGET_ONE_SVC, TARGET_TWO_SVC));
        Request.Get("http://localhost:8080/")
                .execute().returnContent();
        Request.Get(String.format("http://%s/io_task", TARGET_ONE_SVC))
                .execute().returnContent();
        Request.Get(String.format("http://%s/cpu_task", TARGET_TWO_SVC))
                .execute().returnContent();
        logger.debug("chain is finished");
        return "chain";
    }

    @GetMapping("/error_test")
    public String error_test(@RequestParam(value = "name", defaultValue = "World") String name) throws Exception {
        throw new Exception("Error test");
    }
}