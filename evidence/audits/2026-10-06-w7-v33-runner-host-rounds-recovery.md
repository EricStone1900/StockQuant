# W7 V3.3 isolated Runner Host rounds and recovery smoke

Date: 2026-10-06

## Command and result

Ran `pnpm --filter research-automation-service v33:runner-host-rounds-recovery-http-smoke` with the repository's dedicated isolated Research Automation PostgreSQL database and local Linux/amd64 Runner container. The command exited 0. Machine output is retained in [the JSON result](2026-10-06-w7-v33-runner-host-rounds-recovery.json).

The actual Runner Host service claimed one fixture Runner Job over authenticated HTTP, executed its deterministic local computation in the bounded container, published and hash-verified three output Artifacts, and completed the job in PostgreSQL. The smoke killed Host 1 with SIGKILL after checkpoint sequence 1 was persisted; after lease expiry, Host 2 reclaimed the job with fencing token 2, restored cursor 1, persisted sequence 2/cursor 2, and completed. A stale-fence output publication received HTTP 409. The synthetic input contained 1,000 rows; the observed peak memory was 47,039,119 bytes under a 512 MiB limit, peak CPU 49.44%, and peak process count 4 under a 32 PID limit. Provider calls were zero.

## Boundary

This is a separate isolated Runner Host smoke TestRun (`1ebb9976-d593-42ef-b515-6c3efe8e85dc`), not the Platform cross-service dispatch TestRun. It proves the Runner Host execution, checkpoint recovery, artifact publication, and stale-fence rejection components. It does not prove Platform StageRun reconciliation for that smoke, completion of the two queued Jobs from the cross-service TestRun, Experiment aggregate settlement, rejection/recovery business assertions, Paper continuity, Ubuntu acceptance, or user sign-off. V3.3 remains incomplete. File integrity is recorded in the [SHA-256 manifest](2026-10-06-w7-v33-runner-host-rounds-recovery.sha256).
