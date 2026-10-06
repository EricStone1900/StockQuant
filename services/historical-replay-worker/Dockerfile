FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/historical-replay-worker/package.json services/historical-replay-worker/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/historical-replay-worker services/historical-replay-worker
RUN pnpm --filter @stockquant/historical-replay-worker build
FROM node:24.1.0-alpine@sha256:91aa1bb6b5f57ec5109155332f4af2aa5d73ff7b4512c8e5dfce5dc88dbbae0e
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/historical-replay-worker/node_modules ./services/historical-replay-worker/node_modules
COPY --from=build /workspace/services/historical-replay-worker/dist ./services/historical-replay-worker/dist
USER node
EXPOSE 3006
CMD ["node","services/historical-replay-worker/dist/main.js"]
