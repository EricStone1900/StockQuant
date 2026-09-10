FROM node:24.1.0-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY services/decision-governance-service/package.json services/decision-governance-service/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/decision-governance-service services/decision-governance-service
RUN pnpm --filter @stockquant/decision-governance-service build
FROM node:24.1.0-alpine
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/decision-governance-service/node_modules ./services/decision-governance-service/node_modules
COPY --from=build /workspace/services/decision-governance-service/dist ./services/decision-governance-service/dist
USER node
CMD ["node","services/decision-governance-service/dist/main.js"]
