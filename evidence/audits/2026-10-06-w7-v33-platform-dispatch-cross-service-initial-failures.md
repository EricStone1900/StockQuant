# W7 V3.3 cross-service dispatch smoke: initial failures

Date: 2026-10-06

All failures below occurred in disposable local PostgreSQL databases and isolated processes. The harness cleanup dropped its temporary databases and removed its artifact directory; no active service was connected.

1. The first repository-root harness invocation could not resolve `pg`. The smoke now resolves dependencies from the Platform API package.
2. The first HTTP assertion expected readiness creation to return 201, while the real controller contract returns 202. The harness now checks 202.
3. Real dispatch rejected round model IDs containing `:`. IDs now use the accepted `<testRunId>.round-<n>` form.
4. Real ArtifactRef validation rejected round-specific `/round-N` namespace suffixes. Both rounds now use canonical Experiment `inputs` and `outputs` namespaces.
5. Publishing identical generated source with round-specific `sourceRef` conflicted with immutable content-addressed Artifact identity. Provenance is now stable and content-derived, allowing one shared input ArtifactRef.
6. The first history assertion expected too few persisted revisions. The final assertion now checks the actual six-or-more transition history.

The final cross-service smoke and complete V3.3 code suite passed; see the linked audit and suite log. These fixes do not mean queued Runner Jobs were executed.
