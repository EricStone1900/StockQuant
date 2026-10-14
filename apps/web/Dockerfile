# syntax=docker/dockerfile:1.7
FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/market-data-service/package.json services/market-data-service/package.json
COPY services/quant-research-service/package.json services/quant-research-service/package.json
COPY packages/contracts/generated packages/contracts/generated
COPY packages/contracts/schemas/common packages/contracts/schemas/common
COPY fixtures/v1/v1.3/manifest.json fixtures/v1/v1.3/manifest.json
COPY fixtures/v1/v1.3/trading-loop-scenarios.json fixtures/v1/v1.3/trading-loop-scenarios.json
COPY fixtures/v1/v1.3-multileg-v1.0.4/manifest.json fixtures/v1/v1.3-multileg-v1.0.4/manifest.json
COPY fixtures/v1/v1.3-multileg-v1.0.4/trading-loop-scenarios.json fixtures/v1/v1.3-multileg-v1.0.4/trading-loop-scenarios.json
COPY apps/web apps/web
RUN --mount=type=cache,id=stockquant-pnpm-store,target=/pnpm/store,sharing=locked \
    corepack enable && pnpm install --store-dir /pnpm/store --frozen-lockfile --prod=false
RUN pnpm --filter @stockquant/web build

FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=build /workspace/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /workspace/apps/web/dist ./apps/web/dist
COPY --from=build /workspace/apps/web/vite.config.ts ./apps/web/vite.config.ts
RUN mkdir -p /workspace/apps/web/node_modules/.vite-temp && chown node:node /workspace/apps/web/node_modules/.vite-temp
EXPOSE 8080
USER node
CMD ["sh", "-c", "cd apps/web && ./node_modules/.bin/vite preview --config vite.config.ts --host 0.0.0.0 --port 8080"]

COPY fixtures/manifests/v13-us-ordered-fills.schema.json fixtures/manifests/v13-us-ordered-fills.schema.json
COPY fixtures/v1/v1.3-us-ordered-fills-v1.0.0/manifest.json fixtures/v1/v1.3-us-ordered-fills-v1.0.0/manifest.json
COPY fixtures/v1/v1.3-us-ordered-fills-v1.0.0/aapl-out-of-order-restart.json fixtures/v1/v1.3-us-ordered-fills-v1.0.0/aapl-out-of-order-restart.json
