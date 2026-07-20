# syntax=docker/dockerfile:1
# Property Manager — API (NestJS) image. Build context = repo root.
#   docker build -f apps/api/Dockerfile -t <reg>/property-manager-api:<tag> .

# ---------- builder ----------
FROM node:22-slim AS builder
# openssl → Prisma engine. (No node-gyp toolchain: the only native dep,
# msgpackr-extract, is optional and fails soft to a pure-JS path.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci
# Build shared workspace packages in EXPLICIT order first. apps/* import
# @repo/contracts but don't all declare it as a dependency, so turbo's graph
# can race and build the app before contracts/dist exists. Build deps by hand.
RUN npm run build --workspace=@repo/contracts
RUN npm run db:generate --workspace=@repo/db
RUN npm run db:build --workspace=@repo/db
# API build: `npm run build` = rm tsbuildinfo && nest build.
RUN cd apps/api && npm run build
# Fail loudly if the Nest build did not emit.
RUN test -f apps/api/dist/main.js

# ---------- runtime ----------
FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
# Copy the whole built monorepo. We intentionally keep devDependencies because
# `start:prod` registers `tsconfig-paths` (a devDependency) at runtime, and the
# generated Prisma client/engine lives under node_modules/.prisma.
COPY --from=builder /app ./
EXPOSE 20101
# start:prod = node -e "require('tsconfig-paths').register({baseUrl:'./dist',...}); require('./dist/main')"
# --workspace runs it with cwd = apps/api so the relative ./dist paths resolve.
CMD ["npm", "run", "start:prod", "--workspace=property-manager-be"]
