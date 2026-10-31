# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from os import environ

EXPOSE_PORT = int(environ.get("EXPOSE_PORT", default="8000"))
OTEL_SERVICE_NAME = environ.get("OTEL_SERVICE_NAME", "otel-python")
# A non-empty value adds console exporters next to the OTLP ones.
OTEL_DEBUG = environ.get("OTEL_DEBUG", "") != ""
TARGET_ONE_SVC = environ.get("TARGET_ONE_SVC", f"http://localhost:{EXPOSE_PORT}")
TARGET_TWO_SVC = environ.get("TARGET_TWO_SVC", f"http://localhost:{EXPOSE_PORT}")

# Use the stable HTTP semantic conventions (http.server.request.duration,
# http.route, ...) unless the environment chooses otherwise. Instrumentations
# read it once, so it must be set before any of them is set up.
environ.setdefault("OTEL_SEMCONV_STABILITY_OPT_IN", "http")
