FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/market-data-service/package.json services/market-data-service/package.json
COPY services/quant-research-service/package.json services/quant-research-service/package.json
COPY packages/cn-a-fee-rules/package.json packages/cn-a-fee-rules/package.json
COPY packages/cn-a-fee-rules/index.mjs packages/cn-a-fee-rules/index.mjs
COPY packages/cn-a-fee-rules/index.d.ts packages/cn-a-fee-rules/index.d.ts
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile
COPY services/quant-research-service services/quant-research-service
COPY fixtures/v1/v1.4/backtest_daily.csv fixtures/v1/v1.4/backtest_daily.csv
COPY fixtures/v1/v1.4/backtest_benchmark.csv fixtures/v1/v1.4/backtest_benchmark.csv
COPY fixtures/v1/v1.4/backtest_historical_fees.csv fixtures/v1/v1.4/backtest_historical_fees.csv
COPY fixtures/v1/v1.4/market_restrictions_synthetic.csv fixtures/v1/v1.4/market_restrictions_synthetic.csv
COPY fixtures/v1/v1.4/corporate_action_daily.csv fixtures/v1/v1.4/corporate_action_daily.csv
COPY fixtures/v1/v1.4/corporate_actions.csv fixtures/v1/v1.4/corporate_actions.csv
COPY fixtures/v1/v1.4-settlement-v1.2.0/settlement-calendar.json fixtures/v1/v1.4-settlement-v1.2.0/settlement-calendar.json
COPY fixtures/v1/v1.4-settlement-v1.2.0/manifest.json fixtures/v1/v1.4-settlement-v1.2.0/manifest.json
RUN pnpm --filter @stockquant/quant-research-service build
ENV QLIB_SOURCE_COMMIT=UNSET
USER node
CMD ["node","services/quant-research-service/dist/main.js"]
