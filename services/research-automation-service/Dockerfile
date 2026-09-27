FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version tsconfig.base.json ./
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY services/research-automation-service services/research-automation-service
RUN pnpm --filter @stockquant/research-automation-service build \
    && pnpm --filter @stockquant/research-automation-service test

FROM node:24.1.0-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY --from=build /workspace/services/research-automation-service/dist services/research-automation-service/dist
ENV STOCKQUANT_PORT=3008
USER node
CMD ["node", "services/research-automation-service/dist/bootstrap/main.js"]
