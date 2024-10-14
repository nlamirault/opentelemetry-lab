# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.instrumentation.annotations.WithSpan;

@Component
public class CoreService {
    private final Logger logger = LoggerFactory.getLogger(CoreService.class);
    private final Random random = new Random();

    @WithSpan(kind = SpanKind.CLIENT)
    public String getDate() {
        logger.info("retrieve date");

        Span span = Span.current();
        span.setAttribute("peer.service", "random-date-service");
        
        int day = new Random().nextInt(365);
        LocalDate date = LocalDate.now().withDayOfYear(1 + day);
        String output = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

        span.setAttribute("date", output);

        try {
            Thread.sleep(100+random.nextInt(300));

        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
 
        logger.info("generated date: {}", output);
        return output;
    }
}