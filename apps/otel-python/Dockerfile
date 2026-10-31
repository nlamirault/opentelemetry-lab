# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build

WORKDIR /app

# Compile the bytecode, copy from the cache mount instead of linking, and use
# the Python of the image, which is the one of the runtime image.
ENV UV_COMPILE_BYTECODE=1 \
  UV_LINK_MODE=copy \
  UV_PYTHON_DOWNLOADS=0

# Install the dependencies first, so that they are cached across source changes.
RUN --mount=type=cache,target=/root/.cache/uv \
  --mount=type=bind,source=uv.lock,target=uv.lock \
  --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
  uv sync --locked --no-install-project --no-dev

# Install the project as a package: the runtime image only needs the virtualenv.
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked --no-dev --no-editable

FROM python:3.12-slim-bookworm

# Same uid as the distroless nonroot user of the other lab images.
RUN groupadd --system --gid 65532 nonroot \
  && useradd --system --uid 65532 --gid nonroot --no-create-home nonroot

COPY --from=build --chown=nonroot:nonroot /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

USER nonroot
EXPOSE 8000
CMD ["otelpython"]
