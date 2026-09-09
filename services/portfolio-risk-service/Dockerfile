FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/portfolio-risk-service services/portfolio-risk-service
RUN pnpm --filter @stockquant/portfolio-risk-service build

FROM node:24.1.0-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/portfolio-risk-service/node_modules ./services/portfolio-risk-service/node_modules
COPY --from=build /workspace/services/portfolio-risk-service/dist ./services/portfolio-risk-service/dist
EXPOSE 3001
USER node
CMD ["node", "services/portfolio-risk-service/dist/main.js"]
