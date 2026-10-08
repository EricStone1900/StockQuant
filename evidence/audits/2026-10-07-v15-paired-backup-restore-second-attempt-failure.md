# V1.5 paired backup/restore E2E: second attempt failure

Date: 2026-10-07. The browser matrix and normal Run completed (TestRun `9abfb741-b75d-4908-b6ca-2318b3fc3e3e`; 120 authoritative observations), but the snapshot phase failed before producing an archive. The isolated read-only helper had dropped all Linux capabilities and could not traverse the PostgreSQL volume's owner-only data directory (`tar: can't change directory to '/source': Permission denied`). No restore was attempted, so this run does not count as backup/restore evidence.

Project `sq-v15-e2e-e9420358a0c24d0fee35` and its exact containers, volumes and network were removed. The harness now grants the archive helper only the DAC read/search, DAC override and ownership-preservation capabilities needed for copying; it remains network-isolated and mounts the source volume read-only. The next isolated retry must prove this behavior before it can be recorded as PASS.
