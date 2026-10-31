# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import fastapi
import prometheus_client

router = fastapi.APIRouter()


@router.get("/metrics", include_in_schema=False)
def metrics_handler() -> fastapi.Response:
    """Serves the metrics of the Prometheus reader, see telemetry/meter.py."""
    return fastapi.Response(
        content=prometheus_client.generate_latest(),
        media_type=prometheus_client.CONTENT_TYPE_LATEST,
    )
