# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

class OTelPythonError(Exception):
    """Base exception for application."""

    status_code = 500


class OpenTelemetryProtocolException(OTelPythonError):
    status_code = 500
