FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/portfolio-risk-service services/portfolio-risk-service
RUN pnpm --filter @stockquant/portfolio-risk-service build

FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
ENV NODE_ENV=production
COPY fixtures/v1/v1.4-settlement-v1.0.0 ./fixtures/v1/v1.4-settlement-v1.0.0
COPY fixtures/v1/v1.4-settlement-v1.1.0 ./fixtures/v1/v1.4-settlement-v1.1.0
COPY fixtures/v1/v1.4-settlement-v1.2.0 ./fixtures/v1/v1.4-settlement-v1.2.0
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/portfolio-risk-service/node_modules ./services/portfolio-risk-service/node_modules
COPY --from=build /workspace/services/portfolio-risk-service/dist ./services/portfolio-risk-service/dist
EXPOSE 3001
USER node
CMD ["node", "services/portfolio-risk-service/dist/main.js"]
