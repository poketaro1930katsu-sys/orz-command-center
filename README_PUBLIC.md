# ORZ COMMAND CENTER — Public PWA

Release candidate: `v0.5.0-rc1`

This repository contains only the public-facing READ-ONLY application shell for ORZ development status.

## Safety contract
- Evidence-first / Fail-Closed.
- Real money: prohibited.
- Live-trade control: not present.
- Command-center trade API: none.
- Canonical / Frozen auto-edit: blocked.
- GP014B runtime: not authorized.
- Private Evidence Packs, credentials, secrets, tokens, account data, and EA source are not exposed here.
- Unverified performance metrics are not published or inferred.

## Evidence freshness
Visible state is loaded from `public-status.json` using network-only `no-store` fetching. `snapshot_generated_at_jst` records when the sanitized public snapshot was revalidated against the source-of-truth repository. Source commit time is provenance only and is not used as snapshot freshness.

A snapshot older than 72 hours, invalid, or more than 10 minutes future-dated is treated as `STATUS UNKNOWN — FAIL-CLOSED` before PASS values render.

## Public application
The five public sections are functional: 司令塔 / 戦略 / 証拠 / 成績 / AI. The AI section is a deterministic local Evidence Navigator and does not call an external AI API or store a token.

Production deployment is a separate human decision.
