# V1.5 lost-ACK probe counter failure history

Date: 2026-10-07. Isolated project `sq-v15-e2e-5fd014b3c4b04cf1d1c8`; Harness failed during its JetStream probe and removed all project containers, volumes and network.

The one-time ACK-drop hook and shortened ACK wait ran with the V1.5 scenarios. The probe observed its target acknowledgement floor advance, but `ConsumerInfo.num_redelivered` was still 0 at the instant it read the counter, so it failed its inference. This counter snapshot alone does not prove whether the message had been redelivered. No redelivery PASS is claimed from this run.

The next attempt checks the message's delivery metadata in the Platform Consumer itself (`message.info.redelivered`) and preserves that exact server-observed marker in the machine audit, rather than inferring from the aggregate counter.
