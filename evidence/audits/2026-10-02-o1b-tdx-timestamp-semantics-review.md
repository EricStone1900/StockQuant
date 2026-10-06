# O1b TDX timestamp semantics review — 2026-10-02

## Evidence reviewed (offline only)

- Archived 2026-09-30 TDX morning diagnostic for `600000.SH` and `600004.SH` has boundary labels `11:25` and `13:00` for 2026-09-30, but `11:25`, `11:30`, and `13:05` for 2026-09-29.
- The same day's archived morning probe has 20 missing expected `11:30` entries and 20 unexpected `13:00` entries; full-session shadow likewise has 20 missing `11:30` and 20 unexpected `13:00`, with 47/48 bars for each of 20 securities.
- The pinned easy-tdx source at commit `4820b4a0496899ece0b8ca4d7f4d66a5159da7f8` was inspected from the repository-local uv cache. `SymbolBarCmd.parse_response` decodes the protocol's numeric seconds into a naive `datetime`; `_combine_datetime` also only combines date/time fields. Neither function documents whether the label marks interval start or end.
- The saved raw-boundary capture attempt `tdx-boundary-raw-diagnostic.json` is `PARTIAL`: it captured zero securities because the socket bind/connect was denied (`Operation not permitted`). It contains no raw packet evidence that can resolve the ambiguity.

## Conclusion and next step

The archived evidence does not justify changing TDX from end-label to start-label semantics (or applying a one-off shift). The 2026-09-29 and 2026-09-30 boundary signatures differ, while the protocol decoder itself does not state interval semantics. Keep both O1b natural-day checks unpassed and retain the 2026-09-30 PARTIAL result. Once explicit TDX source authorization is available, capture one bounded raw response for the frozen securities with the existing fail-closed diagnostic, compare raw records against provider labels and the official adapter behavior, then decide whether there is a stable mapping or whether TDX must remain rejected as a candidate.

No network call, probe, collection, configuration change, or business-state write occurred in this review.
