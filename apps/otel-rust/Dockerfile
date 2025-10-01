# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

FROM rust:1.90

COPY . /usr/src/otel-rust/

WORKDIR /usr/src/otel-rust/

RUN cargo build --release
RUN cargo install --path .

CMD ["/usr/local/cargo/bin/otel-rust"]
