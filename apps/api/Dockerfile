# syntax=docker/dockerfile:1
# Property Manager — API (NestJS) image. Build context = repo root.
#   docker build -f apps/api/Dockerfile -t <reg>/property-manager-api:<tag> .
#
# Slim, turbo-pruned build. `turbo prune property-manager-be --docker` carves out
# ONLY the api plus its internal workspace deps (@repo/db, @repo/contracts) and a
# pruned lockfile — so the WEB workspace's ~700MB of deps (next, @next, @img,
# lucide-react, …) never enter this image. A final `npm prune --omit=dev` then
# strips the build toolchain (typescript, nest cli, prisma CLI, jest, …). The
# generated Prisma client is preserved across that prune (see note below).

# ---------- pruner: carve the api subset out of the monorepo ----------
FROM node:22-slim AS pruner
WORKDIR /app
COPY . .
# node_modules is dockerignored here, so fetch a pinned turbo to run the prune
# (prune only reads package.json files + the lockfile — no install needed).
RUN npx --yes turbo@2.10.0 prune property-manager-be --docker

# ---------- builder: install pruned deps + build ----------
FROM node:22-slim AS builder
# openssl → Prisma engine.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Install against the pruned lockfile first (keeps this layer cacheable).
COPY --from=pruner /app/out/json/ .
RUN npm ci
# Bring in the pruned source, then build shared packages in EXPLICIT order.
# (apps/api now declares @repo/contracts, so `turbo build` would order this too,
# but the explicit sequence keeps the image build self-contained and legible.)
COPY --from=pruner /app/out/full/ .
RUN npm run build --workspace=@repo/contracts
RUN npm run db:generate --workspace=@repo/db
RUN npm run db:build --workspace=@repo/db
# API build: `npm run build` = rm tsbuildinfo && nest build.
RUN cd apps/api && npm run build
# Fail loudly if the Nest build did not emit.
RUN test -f apps/api/dist/main.js
# Strip devDependencies. `npm prune` also deletes the UNTRACKED generated Prisma
# client at node_modules/.prisma, so back it up and restore it afterwards
# (@prisma/client itself is a prod dep and survives). tsconfig-paths is a prod
# dep — start:prod registers it at runtime.
RUN cp -r node_modules/.prisma /tmp/dot-prisma
RUN npm prune --omit=dev
RUN rm -rf node_modules/.prisma && cp -r /tmp/dot-prisma node_modules/.prisma && rm -rf /tmp/dot-prisma

# ---------- runtime ----------
FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
# Copy the pruned+built monorepo subset (api + @repo/db + @repo/contracts, prod deps).
COPY --from=builder /app ./
EXPOSE 20101
# start:prod = node -e "require('tsconfig-paths').register({baseUrl:'./dist',...}); require('./dist/main')"
# --workspace runs it with cwd = apps/api so the relative ./dist paths resolve.
CMD ["npm", "run", "start:prod", "--workspace=property-manager-be"]
