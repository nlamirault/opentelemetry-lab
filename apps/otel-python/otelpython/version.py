# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from importlib import metadata

try:
    version_info = metadata.version("otelpython")
except metadata.PackageNotFoundError:
    version_info = "unknown"
