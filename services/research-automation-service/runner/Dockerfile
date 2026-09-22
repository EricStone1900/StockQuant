FROM python:3.11-slim@sha256:da047cb8f9d1d98e5c070f5300ba9f7274e33b8fc0e5be5ed88740aed1b95ba9

ARG RD_AGENT_COMMIT=274e274d5dbb72cc2ea139d1a7c93d73ce9b1198
ARG QLIB_COMMIT=3e72593b8c985f01979bebcf646658002ac43b00

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install --no-install-recommends -y git build-essential libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin runner

COPY services/research-automation-service/runner/requirements.lock /tmp/requirements.lock
RUN sed \
      -e '/^pyqlib @ git+/d' \
      -e '/^rdagent @ git+/d' \
      /tmp/requirements.lock > /tmp/requirements-pypi.lock \
    && python -m pip install --no-cache-dir --require-hashes --requirement /tmp/requirements-pypi.lock \
    && python -m pip install --no-cache-dir --no-deps \
      git+https://github.com/microsoft/qlib.git@${QLIB_COMMIT} \
      git+https://github.com/microsoft/RD-Agent.git@${RD_AGENT_COMMIT} \
    && rm -f /tmp/requirements.lock /tmp/requirements-pypi.lock

RUN git clone --filter=blob:none --no-checkout https://github.com/microsoft/RD-Agent.git /opt/rd-agent \
    && cd /opt/rd-agent \
    && git checkout --detach ${RD_AGENT_COMMIT} \
    && git verify-commit ${RD_AGENT_COMMIT} || true \
    && git clone --filter=blob:none --no-checkout https://github.com/microsoft/qlib.git /opt/qlib \
    && cd /opt/qlib \
    && git checkout --detach ${QLIB_COMMIT} \
    && chown -R runner:runner /opt/rd-agent /opt/qlib

COPY services/research-automation-service/runner/runner.py /opt/stockquant/runner.py
COPY services/research-automation-service/runner/versions.json /opt/stockquant/versions.json
RUN chown -R runner:runner /opt/stockquant \
    && chmod 0555 /opt/stockquant/runner.py \
    && python -c "import qlib, rdagent; print('qlib', qlib.__version__); print('rdagent', rdagent.__file__)"

USER runner:runner
WORKDIR /run/input
ENTRYPOINT ["python", "/opt/stockquant/runner.py"]
