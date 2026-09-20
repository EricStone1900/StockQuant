FROM node:24.1.0-alpine
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version tsconfig.base.json ./
COPY services/research-automation-service/package.json services/research-automation-service/package.json
RUN pnpm install --frozen-lockfile
COPY services/research-automation-service services/research-automation-service
RUN pnpm --filter @stockquant/research-automation-service build
ENV STOCKQUANT_PORT=3008
CMD ["node", "services/research-automation-service/dist/bootstrap/main.js"]
