FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/platform-api-service services/platform-api-service
RUN pnpm --filter @stockquant/platform-api-service build

FROM node:24.1.0-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/platform-api-service/node_modules ./services/platform-api-service/node_modules
COPY --from=build /workspace/services/platform-api-service/dist ./services/platform-api-service/dist
EXPOSE 3000
USER node
CMD ["node", "services/platform-api-service/dist/main.js"]
