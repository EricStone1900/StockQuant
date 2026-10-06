# syntax=docker/dockerfile:1.7
FROM node:24.1.0-slim@sha256:5ae787590295f944e7dc200bf54861bac09bf21b5fdb4c9b97aee7781b6d95a2 AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY packages/artifact-content-store/package.json packages/artifact-content-store/package.json
COPY packages/artifact-content-store/index.mjs packages/artifact-content-store/index.mjs
COPY packages/artifact-content-store/index.d.ts packages/artifact-content-store/index.d.ts
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN --mount=type=cache,id=stockquant-pnpm-store,target=/pnpm/store,sharing=locked \
    corepack enable && pnpm install --store-dir /pnpm/store --frozen-lockfile
COPY tsconfig.base.json ./
COPY fixtures fixtures
COPY services/platform-api-service services/platform-api-service
RUN pnpm --filter @stockquant/platform-api-service build

FROM node:24.1.0-slim@sha256:5ae787590295f944e7dc200bf54861bac09bf21b5fdb4c9b97aee7781b6d95a2
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/platform-api-service/node_modules ./services/platform-api-service/node_modules
COPY --from=build /workspace/services/platform-api-service/dist ./services/platform-api-service/dist
COPY --from=build /workspace/packages/artifact-content-store ./packages/artifact-content-store
COPY --from=build /workspace/fixtures ./fixtures
EXPOSE 3000
USER node
CMD ["node", "services/platform-api-service/dist/main.js"]
