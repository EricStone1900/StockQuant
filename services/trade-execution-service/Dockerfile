FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/trade-execution-service/package.json services/trade-execution-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/trade-execution-service services/trade-execution-service
RUN pnpm --filter @stockquant/trade-execution-service build
FROM node:24.1.0-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/trade-execution-service/node_modules ./services/trade-execution-service/node_modules
COPY --from=build /workspace/services/trade-execution-service/dist ./services/trade-execution-service/dist
USER node
EXPOSE 3005
CMD ["node", "services/trade-execution-service/dist/main.js"]
