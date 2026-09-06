## syntax=docker/dockerfile:1
#
# Single deployable image: Node/Express API (serving the built client as static files) plus
# z88dk (with zsdcc) and cc65, so the container needs no external `Z88DK_HOME`/`CC65_HOME`
# install to compile against. The toolchains themselves are built from source in
# `Dockerfile.toolchains` and published separately (see that file) - this Dockerfile just
# pulls the pinned, pre-built result, so every app-only change here is a fast rebuild instead
# of redoing the slow from-source toolchain build.
#
# Build:  docker build -t retro-explorer .
# Run:    docker run -p 4000:4000 retro-explorer

ARG TOOLCHAINS_IMAGE=retroexploreracr.azurecr.io/retro-explorer-toolchains:z88dk-v2.4-cc65-V2.19
FROM ${TOOLCHAINS_IMAGE} AS toolchains

# ---- app: install deps + build client and server ----
FROM node:22-bookworm-slim AS app-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
COPY server server
RUN npm run build:client && npm run build:server

# ---- runtime: same OS version as the toolchains were built on so their dynamic libs (e.g. Boost) resolve ----
FROM ubuntu:24.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg m4 \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY --from=toolchains /opt/z88dk /opt/z88dk
COPY --from=toolchains /opt/cc65 /opt/cc65
ENV Z88DK_HOME=/opt/z88dk
ENV CC65_HOME=/opt/cc65

WORKDIR /app
COPY --from=app-builder /app/package.json ./package.json
# npm workspaces hoist everything into the root node_modules; node's resolution walks up from
# server/dist so this single copy covers both workspaces (includes unused client-only/dev
# packages too - trimming that is a later optimization, not required for this to work).
COPY --from=app-builder /app/node_modules ./node_modules
COPY --from=app-builder /app/server/package.json ./server/package.json
COPY --from=app-builder /app/server/dist ./server/dist
COPY --from=app-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
