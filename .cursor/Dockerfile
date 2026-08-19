FROM node:22.23.2-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && id ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu

USER ubuntu
WORKDIR /home/ubuntu
