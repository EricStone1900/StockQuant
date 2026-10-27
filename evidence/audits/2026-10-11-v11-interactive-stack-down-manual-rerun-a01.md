# V1.1 current runbook retry cleanup record

Exact isolated project: `sq-v11-stack-5bbc133167690245d540`.

Command executed after the stack-up process was stopped:

```bash
pnpm stack:down -- --project sq-v11-stack-5bbc133167690245d540
```

Observed command result: exit 0; `status=STOPPED_AND_PURGED`; removed project-scoped PostgreSQL volume, containers, network, project images, and credentials file; `activeComposeTargeted=false`. The stack-down verifier confirmed no remaining project containers, volumes, or networks before returning success.
