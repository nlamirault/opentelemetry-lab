class OTelPythonError(Exception):
    """Base exception for application."""

    status_code = 500


class OpenTelemetryProtocolException(OTelPythonError):
    status_code = 500
