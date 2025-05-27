from importlib import metadata

try:
    version_info = metadata.version("otelpython")
except metadata.PackageNotFoundError:
    version_info = "unknown"
