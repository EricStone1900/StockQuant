# V3.1 isolated CPU Runner

This image is the execution boundary for a single V3.1 research experiment. It
contains the frozen RD-Agent v0.8.0 commit and Qlib commit from `versions.json`.
The image is built for Linux `amd64` with a CPU-only Python 3.11 base. It does
not contain model credentials, a controller secret, or a Docker socket.

The controller must start it with the following runtime policy:

```sh
docker run --rm --platform linux/amd64 \
  --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 128 \
  --cpus 2 --memory 2g --user 10001:10001 \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -v "$JOB_DIR:/run/input:ro" -v "$OUTPUT_DIR:/run/output:rw" \
  stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593
```

The job file must set `network_policy` to `DENY`, use a `v31/` artifact
namespace, and point `script` to a Python file below `/run/input/code`. The
entrypoint strips the inherited environment before running the script. A
successful image build still does not constitute a real model acceptance run;
the model gateway and outbound allowlist remain disabled until their separate
approval and evidence gates are met.

The host-side smoke command verifies the locally built image ID before running
the same policy and never pulls an image. It covers normal execution, timeout
rejection and path escape rejection:

```sh
pnpm v31:runner-smoke
```
