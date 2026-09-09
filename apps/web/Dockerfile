FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/market-data-service/package.json services/market-data-service/package.json
COPY services/quant-research-service/package.json services/quant-research-service/package.json
COPY apps/web apps/web
RUN corepack enable && pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @stockquant/web build

FROM node:24.1.0-alpine
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /workspace/apps/web/dist ./apps/web/dist
COPY --from=build /workspace/apps/web/vite.config.ts ./apps/web/vite.config.ts
EXPOSE 8080
USER node
CMD ["sh", "-c", "cd apps/web && ./node_modules/.bin/vite preview --config vite.config.ts --host 0.0.0.0 --port 8080"]
