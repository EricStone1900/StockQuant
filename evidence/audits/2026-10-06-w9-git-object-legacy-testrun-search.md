# W9 search of Git objects for missing legacy TestRuns

Date: 2026-10-06 (Asia/Shanghai)

## Result

No recoverable structured TestRun bundle or Artifact payload was found for the 13 exact V1/V2 IDs that still lack exports. All 13 UUIDs occur in Git history, but their matching commits only modify the corresponding stage plan, acceptance index, or evidence summary documents. No commit diff adds a Run export or Artifact bundle.

The repository has only `main`, `origin/main`, and `origin/HEAD` refs; the reflog ends on 2026-09-27; the stash is empty. `git fsck --full --no-reflogs --unreachable` found no unreachable commits, but did find 9,399 trees and 3,962 blobs. All 11,201 Git blobs (23,203 total objects) were searched as a batch for the 13 UUIDs. The UUID-bearing unreachable blobs were classified as 33 old V1 acceptance documents, 32 old V2 acceptance documents, two W9 availability notes, and one version-gate JSON; none was a structured Run bundle or Artifact payload.

## Scope and limits

This is a read-only scan of the local Git object database, refs, reflogs, and stash. It does not search another machine, remote object store, user backup service, or original test server. Preserve the missing statuses until an original backup/export source is available; do not reconstruct historical business facts from stage documentation or substitute new TestRuns.

Machine details, exact missing IDs, matched documentation commits, object counts, and classifications are in [the JSON report](./2026-10-06-w9-git-object-legacy-testrun-search.json). The earlier Docker-volume and repository-backup searches remain in [the legacy PostgreSQL audit](./2026-10-06-w9-stock-analysis-volume-search/README.md).
