FROM node:24.1.0-alpine
WORKDIR /workspace
RUN apk add --no-cache python3 py3-pip && corepack enable
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
COPY services/market-data-adapter services/market-data-adapter
# This disposable image has no system package manager state to preserve; Alpine
# marks its interpreter externally managed, so acknowledge that boundary here.
RUN python3 -m pip install --break-system-packages --no-cache-dir --require-hashes -r services/market-data-adapter/requirements.lock \
 && python3 -m pip install --break-system-packages --no-cache-dir --no-deps ./services/market-data-adapter
RUN pnpm --filter @stockquant/market-data-service build
CMD ["node","services/market-data-service/dist/main.js"]
