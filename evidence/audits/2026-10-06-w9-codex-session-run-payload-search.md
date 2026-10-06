# W9 Codex session-log search for missing historical TestRun payloads

Date: 2026-10-06 (Asia/Shanghai)

## Scope and method

This supplements the repository Git-object and local database/backup searches in [the W9 legacy TestRun search](./2026-10-06-w9-git-object-legacy-testrun-search.md). I searched the local Codex session JSONL logs for the 13 exact missing V1/V2 TestRun UUIDs listed in that report. The scan was read-only and emitted only filenames, UUID match counts, and output classification; it did not copy or change session data.

## Result

The UUIDs appear in 51 session-log files. Some tool outputs contain execution acknowledgements such as `accepted` and `RUNNING`/`COMPLETED`, while later outputs contain version-gate entries explicitly stating `structured run export is missing`. The searched session logs did not yield a standalone structured TestRun export or Artifact payload that could pass the current version evidence verifier. Conversation summaries and status acknowledgements cannot replace business facts, attachments, or hashes.

I also searched both local Codex SQLite metadata databases read-only (`codex-dev.db`, 13 tables; `codex-thread-summaries-dev.db`, 1 table), the Codex attachment files/index, and the sibling local `StockAnalysis` project for the same exact UUIDs. None contained a matching payload. These stores therefore add no recoverable evidence.

As a path inventory, I checked Desktop, Downloads, CloudStorage, mounted volumes, and StockQuant-named paths within the home directory to depth six. No additional StockQuant-named backup/export location was found. This is a filename/location inventory, not a claim that arbitrary user files or external backup services were searched.

The historical exports remain missing: V1 has seven and V2 has six. No stage status or acceptance signature was changed. Recovery now still requires an original backup/export source outside the searched repository objects, database volumes/backups, local Codex session logs/metadata/attachments, and sibling project.

No services, database, evidence exports, collection, or Paper state were modified.
