// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package xyz.lamirault.otel.app.telemetry;

import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.semconv.ServiceAttributes;

public final class ResourceConfiguration {

  private ResourceConfiguration() {}

  public static Resource createResource(String serviceName) {
    Resource resource = Resource.getDefault()
      .toBuilder()
      .put(ServiceAttributes.SERVICE_NAME, serviceName)
      .put(ServiceAttributes.SERVICE_VERSION, "1.0.0")
      .build();
    return resource;
  }
}
