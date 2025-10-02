FROM oven/bun:1.2 AS jsbuilder
WORKDIR /src
COPY package.json bun.lock /src/
RUN bun ci
COPY .babelrc webpack.config.js /src/
COPY scanomatic/ui_server_data /src/scanomatic/ui_server_data
RUN bun run build

FROM python:3.9-slim-bookworm AS pybuilder
RUN apt-get update && apt-get install -y gcc python3-dev
COPY --from=ghcr.io/astral-sh/uv:0.4.9 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY uv.lock pyproject.toml /app/
# Install deps first to optimize caching as they change less often
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --frozen --no-install-project --no-dev
COPY . /app
# Install scan-o-matic itself last
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --frozen --no-dev


FROM python:3.9-slim-bookworm
ENV DEBIAN_FRONTEND=noninteractive
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt update && apt-get --no-install-recommends install -y \
    tzdata \
    usbutils software-properties-common \
    net-tools iputils-ping \
    libsane sane-utils libsane-common \
    nmap \
    && rm -rf /var/lib/apt/lists/*
# Set timezone to UTC
RUN ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime \
    && dpkg-reconfigure --frontend noninteractive tzdata
# Add scanner id to sane config in case scanimage -L cannot find the scanner automatically
# Epson V800
RUN echo "usb 0x4b8 0x12c" >> /etc/sane.d/epson2.conf
# Epson V700
RUN echo "usb 0x4b8 0x151" >> /etc/sane.d/epson2.conf
# Copy default scan-o-matic config
COPY data/config /root/.scan-o-matic/config/
COPY --from=jsbuilder /src/scanomatic/ui_server_data/js/somlib /tmp/scanomatic/ui_server_data/js/somlib
COPY --from=pybuilder /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 5000
WORKDIR /app
CMD scan-o-matic --no-browser
