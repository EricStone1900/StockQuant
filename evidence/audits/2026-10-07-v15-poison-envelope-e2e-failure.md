# V1.5 poison-envelope E2E probe failure history

Date: 2026-10-07. Random isolated Compose project `sq-v15-e2e-32867265acd62f7d7204`; overall Harness FAIL, exact containers, volumes, network and project images were cleaned.

The Platform/API/Web stack started and the normal TestRun was created, but the probe command executed inside the Platform container used root `/workspace/[eval]` package resolution. Node could not find the `nats` package from that evaluation context, so the harness aborted before publishing any malformed message. This is a test-harness setup failure; JetStream poison-message behavior was not exercised and no business result is inferred.

The captured error was `ERR_MODULE_NOT_FOUND: Cannot find package 'nats' imported from /workspace/[eval1]`. The next attempt changes only the probe to resolve NATS from the Platform service package directory. The original full failed harness JSON was overwritten by the harness's later run; project identity, failure output and cleanup state are retained here.
