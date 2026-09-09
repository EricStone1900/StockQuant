FROM node:24.1.0-alpine
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/market-data-service/package.json services/market-data-service/package.json
COPY services/quant-research-service/package.json services/quant-research-service/package.json
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile
COPY fixtures fixtures
COPY services/market-data-service services/market-data-service
RUN pnpm --filter @stockquant/market-data-service build
CMD ["node","services/market-data-service/dist/main.js"]
