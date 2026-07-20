# syntax=docker/dockerfile:1
# Property Manager — Web (Next.js standalone) image. Build context = repo root.
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... \
#     -t <reg>/property-manager-web:<tag> .

# ---------- builder ----------
FROM node:22-slim AS builder
# openssl → Prisma engine (@repo/db generate runs in this build too).
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci
# NEXT_PUBLIC_* are inlined into the client bundle at build time — must be present now.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# lib/env.ts validates server env with zod AT IMPORT TIME; `next build` imports route
# modules during page-data collection, so these must be set or the build throws.
# PLACEHOLDERS only — non-NEXT_PUBLIC vars are NOT inlined into the bundle; the real
# values are injected at RUNTIME via compose env_file (which overrides these).
ENV NEXTAUTH_SECRET=build-time-placeholder \
    API_URL=http://api:20101 \
    OIDC_ISSUER=https://prorentallb.cloud/keycloack/realms/prorentallb \
    OAUTH_CLIENT=prorentallb-web \
    OAUTH_SECRET=build-time-placeholder \
    KEYCLOAK_BASE=https://prorentallb.cloud/keycloack \
    KEYCLOAK_REALM=prorentallb
# Build shared workspace packages in EXPLICIT order first (see api Dockerfile note).
RUN npm run build --workspace=@repo/contracts
RUN npm run db:generate --workspace=@repo/db
RUN npm run db:build --workspace=@repo/db
# Next standalone build (output:'standalone').
RUN cd apps/web && npm run build
# Fail loudly if the standalone server was not emitted where we expect it.
RUN test -f apps/web/.next/standalone/apps/web/server.js
# Ensure a public/ dir exists so the runtime COPY always succeeds (repo has none today).
RUN mkdir -p apps/web/public

# ---------- runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
# Next standalone output: self-contained server + traced node_modules.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
