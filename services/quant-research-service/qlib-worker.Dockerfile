FROM python:3.11-slim@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e
WORKDIR /opt/qlib
ARG STOCKQUANT_PYTHON_INDEX_URL=https://pypi.org/simple
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1=14.2.0-19 \
    && rm -rf /var/lib/apt/lists/*
COPY qlib-worker-build-tools.lock .
RUN pip install --no-cache-dir --index-url="${STOCKQUANT_PYTHON_INDEX_URL}" --require-hashes --only-binary=:all: --no-deps -r qlib-worker-build-tools.lock
COPY qlib-worker-requirements.lock .
RUN pip install --no-cache-dir --index-url="${STOCKQUANT_PYTHON_INDEX_URL}" --require-hashes --no-build-isolation --no-deps -r qlib-worker-requirements.lock \
    && pip check
COPY qlib-worker.py .
RUN groupadd --system --gid 10001 stockquant \
    && useradd --system --uid 10001 --gid stockquant --no-create-home --home-dir /nonexistent stockquant
ENV HOME=/tmp
USER 10001:10001
ENV QLIB_SOURCE_COMMIT=5a84aaf1dc402232646ad2836dea33ff15886552
CMD ["python", "qlib-worker.py"]
