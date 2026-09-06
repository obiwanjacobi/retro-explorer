## syntax=docker/dockerfile:1
#
# Single deployable image: Node/Express API (serving the built client as static
# files) plus its own from-source builds of z88dk (with zsdcc) and cc65, so the
# container needs no external `Z88DK_HOME`/`CC65_HOME` install to compile against.
#
# The z88dk/cc65 build stages are the slow part (zsdcc alone can take a long
# time) - they only need to be rebuilt when bumping the pinned toolchain
# versions below, and are independent of the app-builder stage so an app-only
# change reuses Docker's build cache for them.
#
# Build:  docker build -t retro-explorer .
# Run:    docker run -p 4000:4000 retro-explorer

# ---- z88dk: OS packages + CPAN modules (https://github.com/z88dk/z88dk/wiki/installation#6-building-from-sources) ----
# Needs Ubuntu 24.04+ (Boost >= 1.79) - zsdcc's build fails on 22.04's Boost 1.74 (SDCC bug #3772).
FROM ubuntu:24.04 AS z88dk-deps
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential bison flex libxml2-dev zlib1g-dev m4 ragel re2c dos2unix \
    texinfo texi2html curl ca-certificates git perl cpanminus ccache \
    libboost-all-dev libmodern-perl-perl libyaml-perl liblocal-lib-perl \
    libcapture-tiny-perl libpath-tiny-perl libtext-table-perl libdata-hexdump-perl \
    libregexp-common-perl libclone-perl libfile-slurp-perl pkg-config libgmp3-dev \
  && rm -rf /var/lib/apt/lists/*
RUN cpanm --notest \
    App::Prove CPU::Z80::Assembler Data::Dump Data::HexDump Test::HexDifferences \
    File::Path List::Uniq Modern::Perl Object::Tiny::RW Regexp::Common \
    Test::Harness Text::Diff Text::Table YAML::Tiny

# ---- z88dk: clone + build ----
# Pinned to a release tag (not `master`, which moves) for reproducible builds. Override with
# `--build-arg Z88DK_GIT_REF=v2.3` etc. to build a different/older version - see release tags at
# https://github.com/z88dk/z88dk/tags.
FROM z88dk-deps AS z88dk-builder
ARG Z88DK_GIT_REF=v2.4
WORKDIR /opt/z88dk
RUN git clone --recursive --depth 1 --branch ${Z88DK_GIT_REF} https://github.com/z88dk/z88dk.git .
ENV BUILD_SDCC=1 BUILD_SDCC_HTTP=1 PATH="/opt/z88dk/bin:${PATH}" ZCCCFG=/opt/z88dk/lib/config/
RUN chmod +x build.sh && ./build.sh
# Drop everything not needed at runtime (docs/tests/examples/vcs history) to shrink the final image.
RUN rm -rf .git doc examples support src/tests

# ---- cc65: OS packages ----
FROM ubuntu:24.04 AS cc65-deps
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- cc65: clone + build ----
# Pinned to a release tag for the same reason as z88dk above; see https://github.com/cc65/cc65/tags.
FROM cc65-deps AS cc65-builder
ARG CC65_GIT_REF=V2.19
WORKDIR /opt/cc65
RUN git clone --depth 1 --branch ${CC65_GIT_REF} https://github.com/cc65/cc65.git .
RUN make -j"$(nproc)"
RUN rm -rf .git doc test targettest samples

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

# ---- runtime: same OS version as the toolchain builders so their dynamic libs (e.g. Boost) resolve ----
FROM ubuntu:24.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY --from=z88dk-builder /opt/z88dk /opt/z88dk
COPY --from=cc65-builder /opt/cc65 /opt/cc65
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
