FROM node:24.11.1-bookworm-slim AS base

RUN npm install --global npm@11.6.2
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && curl --fail --silent --show-error --retry 3 \
        https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
        --output /etc/ssl/certs/aws-rds-global-bundle.pem \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-global-bundle.pem
WORKDIR /app

FROM base AS build

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN npm ci --no-audit --no-fund

COPY . .

# Prisma only needs a syntactically valid URL while generating the client.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npx turbo run build --filter=api

FROM base AS production-dependencies

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN npm ci --omit=dev \
    --workspace=api \
    --workspace=@repo/contracts \
    --workspace=@repo/db \
    --include-workspace-root \
    --no-audit \
    --no-fund

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY --from=production-dependencies /app/node_modules node_modules

COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /app/packages/contracts/dist packages/contracts/dist
COPY --from=build --chown=node:node /app/packages/database/dist packages/database/dist
COPY --chown=node:node packages/database/prisma packages/database/prisma
COPY --chown=node:node packages/database/prisma.config.ts packages/database/prisma.config.ts

USER node
EXPOSE 3001

CMD ["sh", "-c", "npm run db:deploy --workspace=@repo/db && node apps/api/dist/main.js"]
