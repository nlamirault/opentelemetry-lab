# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from os import environ

EXPOSE_PORT = int(environ.get("EXPOSE_PORT", default="8000"))
OTEL_SERVICE_NAME = environ.get("OTEL_SERVICE_NAME", "otel-python")
OTEL_EXPORTER_OTLP_ENDPOINT = environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")  # , "http://127.0.0.1:4317")
OTEL_EXPORTER_OTLP_PROTOCOL = environ.get("OTEL_EXPORTER_OTLP_PROTOCOL")  # , default="http")
TARGET_ONE_SVC = environ.get("TARGET_ONE_SVC", f"http://localhost:{EXPOSE_PORT}")
TARGET_TWO_SVC = environ.get("TARGET_TWO_SVC", f"http://localhost:{EXPOSE_PORT}")
