# W8 paired-backup file-hash evidence

On 2026-10-03 (Asia/Shanghai), `pnpm --dir services/research-automation-service backup:paired-smoke` passed against a random isolated Compose project. The smoke now re-reads every file listed by the generated cluster backup manifest before temporary cleanup, checks exact byte count and SHA-256 against the manifest, and prints the backup-manifest SHA-256 plus per-file digests. The retained evidence is in the adjacent JSON; the temporary backup contents and secrets are not retained.

The restore validated three databases, one role and five published/retained Research and Platform/Qlib Artifact references. The generated backup contains four files; notably `artifacts.tar` is 20,480 bytes with SHA-256 `5675b33d5fe48f53515ce8ba75ce0c347e67030ed99679d63e50ceea526c29d7`. The `cluster.sql` dump and the overall manifest are also hashed. The test confirmed role password material was absent.

Read-only cleanup checks found no container or project network for the random Compose project, neither temporary named volume nor temporary workspace remained; the active Research Artifact volume was present. The 13 active project container IDs matched the saved baseline. The first comparison exposed a transcription error in the saved Quant Research container ID; a direct `docker ps` check showed the container had remained Up for 10 days, the inventory typo was corrected, and the repeated comparison matched. No active service or volume was modified.

This strengthens evidence for the local isolated backup artifact and restore path. It does not verify a backup of the active 48-database cluster, offsite copies, approved writer quiescence, RPO/RTO, actual Ubuntu restore, maintenance migration, or Ubuntu observation. W8 remains open for those requirements.
