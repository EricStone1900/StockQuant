FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version tsconfig.base.json ./
COPY packages/artifact-content-store packages/artifact-content-store
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY services/research-automation-service services/research-automation-service
RUN pnpm --filter @stockquant/research-automation-service build \
    && pnpm --filter @stockquant/research-automation-service test

FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY --from=build /workspace/services/research-automation-service/dist services/research-automation-service/dist
COPY --from=build /workspace/packages/artifact-content-store packages/artifact-content-store
ENV STOCKQUANT_PORT=3008
USER node
CMD ["node", "services/research-automation-service/dist/bootstrap/main.js"]
