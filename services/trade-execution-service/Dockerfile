FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/trade-execution-service/package.json services/trade-execution-service/package.json
COPY packages/cn-a-fee-rules/package.json packages/cn-a-fee-rules/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/cn-a-fee-rules packages/cn-a-fee-rules
COPY services/trade-execution-service services/trade-execution-service
RUN pnpm --filter @stockquant/trade-execution-service build
FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/trade-execution-service/node_modules ./services/trade-execution-service/node_modules
COPY --from=build /workspace/services/trade-execution-service/dist ./services/trade-execution-service/dist
COPY --from=build /workspace/packages/cn-a-fee-rules ./packages/cn-a-fee-rules
COPY packages/contracts/fixtures/v24-paper-execution-policy-v1.json ./packages/contracts/fixtures/v24-paper-execution-policy-v1.json
COPY packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json ./packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json
COPY fixtures/v1/v1.4-settlement-v1.1.0 ./fixtures/v1/v1.4-settlement-v1.1.0
COPY fixtures/v1/v1.4-settlement-v1.2.0 ./fixtures/v1/v1.4-settlement-v1.2.0
USER node
EXPOSE 3005
CMD ["node", "services/trade-execution-service/dist/main.js"]
