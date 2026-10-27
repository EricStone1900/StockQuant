FROM python:3.11-slim-bookworm@sha256:a36c24f9cbdf4fd0f52d67f0823eeac19c2028c637cecc392d97f980d4fec56b
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY services/market-monitor-service/requirements.lock ./requirements.lock
RUN pip install --no-cache-dir --require-hashes -r requirements.lock
COPY services/market-monitor-service/src ./src
COPY services/market-monitor-service/migrations ./migrations
RUN useradd --system --uid 10001 stockquant && chown -R stockquant:stockquant /app
USER 10001:10001
ENV PYTHONPATH=/app/src
EXPOSE 3009
CMD ["python", "-m", "stockquant_market_monitor.main"]
