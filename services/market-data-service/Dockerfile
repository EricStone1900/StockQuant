# syntax=docker/dockerfile:1.7
FROM python:3.11-slim-bookworm@sha256:a36c24f9cbdf4fd0f52d67f0823eeac19c2028c637cecc392d97f980d4fec56b AS python-runtime
ARG STOCKQUANT_INSTALL_TDX=0
WORKDIR /workspace
COPY services/market-data-adapter/requirements.lock services/market-data-adapter/requirements.lock
RUN python -m pip install --no-cache-dir --require-hashes -r services/market-data-adapter/requirements.lock
COPY services/market-data-adapter services/market-data-adapter
RUN python -m pip install --no-cache-dir --no-deps ./services/market-data-adapter
RUN if [ "$STOCKQUANT_INSTALL_TDX" = "1" ]; then \
      python -m pip install --no-cache-dir --require-hashes -r services/market-data-adapter/requirements-tdx-runtime.lock \
      && python -m pip install --no-cache-dir --no-deps "easy-tdx @ https://github.com/clong365/easy_tdx/archive/4820b4a0496899ece0b8ca4d7f4d66a5159da7f8.zip"; \
    fi

FROM node:24.1.0-bookworm-slim@sha256:5ae787590295f944e7dc200bf54861bac09bf21b5fdb4c9b97aee7781b6d95a2
WORKDIR /workspace
COPY --from=python-runtime /usr/local/bin/python3 /usr/local/bin/python3
COPY --from=python-runtime /usr/local/bin/python3.11 /usr/local/bin/python3.11
COPY --from=python-runtime /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=python-runtime /workspace/services/market-data-adapter/src/market_data_adapter/parquet_to_jsonl.py services/market-data-adapter/src/market_data_adapter/parquet_to_jsonl.py
COPY --from=python-runtime /usr/local/lib/libpython3.11.so* /usr/local/lib/
COPY --from=python-runtime /usr/lib/*-linux-gnu/libssl.so.3 /usr/lib/
COPY --from=python-runtime /usr/lib/*-linux-gnu/libcrypto.so.3 /usr/lib/
RUN ln -sf /usr/local/bin/python3.11 /usr/local/bin/python3 \
 && corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY services/platform-api-service/package.json services/platform-api-service/package.json
COPY services/portfolio-risk-service/package.json services/portfolio-risk-service/package.json
COPY services/market-data-service/package.json services/market-data-service/package.json
COPY services/quant-research-service/package.json services/quant-research-service/package.json
COPY tsconfig.base.json ./
RUN --mount=type=cache,id=stockquant-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --store-dir /pnpm/store --frozen-lockfile
COPY fixtures fixtures
COPY services/market-data-service services/market-data-service
RUN python3 -c 'import pyarrow; from market_data_adapter import __name__; print("pyarrow", pyarrow.__version__)'
RUN pnpm --filter @stockquant/market-data-service build
RUN install -d -o node -g node /var/lib/stockquant
USER node
CMD ["node","services/market-data-service/dist/main.js"]
