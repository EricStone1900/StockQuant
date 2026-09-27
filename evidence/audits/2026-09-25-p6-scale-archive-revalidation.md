# P6 frozen scale archive revalidation

Date: 2026-09-25 (Asia/Shanghai). Read-only validation of local frozen artifacts; no external source request, live subscription mutation, or active service restart.

## Results

- 100 × 60 session minute archive: `node scripts/validate-baostock-minute-archive.mjs --manifest data/local/baostock-minute-100x60-2024-01-02-2024-04-02-v1/manifest.json --expected-securities 100 --output evidence/dc08a/historical-coverage-100x60-2026-09-25.json` exited 0. All 288,000 expected bars passed per-security/per-day row count, OHLCV bounds, duplicate-key, manifest and file SHA checks.
- 500 × 60 session minute archive: same validator with the `500x60` manifest and `--expected-securities 500` exited 0. All 1,440,000 bars passed the same assertions. Reports retain manifest SHAs `5f80293b33ee23ad6ecd4a2141ea274eeb883d0215724ee0ed405d7596505e1b` (100) and `59e677807518ff37a4571494b66738b71f86fe9da270468e4e7ef3719cee90e3` (500).
- Frozen 2019–2024 daily archive was read end-to-end: manifest SHA-256 `adae48c4021454c5abe9f832f386778cc436277d35d58283541c568953f7dc4a`, 5,219/5,219 files, 6,260,343 data rows, zero manifest SHA or row-count mismatches.
- Current worktree changes to market-data-service add the independent persisted minute-import API. They do not modify the historical archive validator, `v25-monitor-capacity.mjs`, daily importer, or the V2.3 replay algorithm. The historical-replay-worker change is limited to authenticating portfolio-service requests with its own Bearer credential.

The frozen files and their manifests are intact at these scales. This does not rerun online 50/80/100 collection-pool behavior, prove current host resource headroom or Ubuntu capacity, verify real-time source limits, establish second-source coverage, or close PIT revision gaps. Those stay open; the online pool was not touched.
