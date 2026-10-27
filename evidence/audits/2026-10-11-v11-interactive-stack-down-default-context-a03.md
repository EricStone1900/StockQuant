# V1.1 default-context stack retry cleanup

Random project: `sq-v11-stack-8b8e39d8d77fa5479c17`.

Command: `DOCKER_CONTEXT=default pnpm stack:down -- --project sq-v11-stack-8b8e39d8d77fa5479c17`.

Observed result: exit 0, `STOPPED_AND_PURGED`; project-scoped containers, PostgreSQL volume, network, images and credentials removed; `activeComposeTargeted=false`.
