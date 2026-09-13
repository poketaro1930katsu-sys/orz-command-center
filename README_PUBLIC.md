# ORZ COMMAND CENTER

Public, read-only PWA for ORZ EA development and verification status.

## Release candidate

`v0.5.0-rc1`

This repository contains only the public-facing application shell and a sanitized `public-status.json` snapshot.

It does **not** contain:
- EA source code
- trading credentials or account information
- private Evidence Packs
- API keys, tokens, cookies, or secrets
- live-trade controls
- real-money execution controls

## Safety contract

- Fail-Closed: enforced
- Real money: prohibited
- Live trade control: not present
- Canonical / Frozen auto-edit: blocked
- `public-status.json`: network-only / `no-store`; stale cached PASS is not accepted
- Snapshot freshness is evaluated from `snapshot_generated_at_jst`, the last verified public-state reconciliation time
- Source commit time is provenance only and does not by itself make a freshly revalidated snapshot stale
- UI state is not an authorization channel

## App sections

- 司令塔: current Canonical, strategy Evidence, next gate, freshness, safety
- 戦略: confirmed scope vs not-authorized scope
- 証拠: sanitized Repository Evidence lineage and hashes
- 成績: verified performance only; otherwise explicitly UNVERIFIED
- AI: deterministic, local Evidence navigator; no external AI API or secret key

Production deployment is a separate human decision.
