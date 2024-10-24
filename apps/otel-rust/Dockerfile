FROM rust:1.81
COPY . /usr/src/otel-rust/
WORKDIR /usr/src/otel-rust/
RUN cargo build --release
RUN cargo install --path .
CMD ["/usr/local/cargo/bin/otel-rust"]