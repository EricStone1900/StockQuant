# V3.1 isolated CPU Runner

This image is the execution boundary for a single V3.1 research experiment. It
contains the frozen RD-Agent v0.8.0 and Qlib commits plus their complete
Linux/AMD64 Python 3.11 runtime dependency graph. `uv.lock` pins the source
commits and 348 resolved packages; `requirements.rdagent.lock` is the hash-pinned
PyPI export consumed by the image build. The smoke suite imports RD-Agent,
LiteLLM, and OpenAI from this same locked environment. The image does not
contain model credentials, a controller secret, or a Docker socket.

The controller must start it with the following runtime policy:

```sh
docker run --rm --platform linux/amd64 \
  --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 128 \
  --cpus 2 --memory 2g --user 10001:10001 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -v "$JOB_DIR:/run/input:ro" -v "$OUTPUT_DIR:/run/output:rw" \
  stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-full-deps
```

The job file must set `network_policy` to `DENY`, use a `v31/` artifact
namespace, and point `script` to a Python file below `/run/input/code`. The
entrypoint strips the inherited environment before running the script. A
successful image build still does not constitute a real model acceptance run;
the model gateway and outbound allowlist remain disabled until their separate
approval and evidence gates are met.

The image sets `LITELLM_LOCAL_MODEL_COST_MAP=True` so importing its model
dependencies cannot try to fetch LiteLLM's mutable cost map. This is an offline
runtime safeguard; it does not configure RD-Agent credentials, permit model
calls, or make LiteLLM's local cost estimates authoritative for billing.

The Runner passes a fixed, non-secret RD-Agent settings set through its
otherwise scrubbed child environment: prompt/response content logging, chat and
embedding caches, cache dumps, and streaming are disabled, and each underlying
completion/embedding attempt is limited to one try. RD-Agent's own long-answer
auto-continuation loop remains in the pinned upstream implementation and can
still issue multiple calls; real model interaction therefore remains blocked
until the trusted gateway enforces request budgets and call counts.

The host-side smoke command verifies the locally built image ID before running
the same policy and never pulls an image. For a new image, set
`STOCKQUANT_RUNNER_IMAGE_REF` and `STOCKQUANT_RUNNER_IMAGE_ID` to the exact local
tag and inspected digest. The smoke imports all model runtime dependencies,
checks that secrets and the Docker socket are absent, and covers normal
execution, timeout, path escape, and a bounded 128MiB OOM termination:

```sh
pnpm v31:runner-smoke
```
