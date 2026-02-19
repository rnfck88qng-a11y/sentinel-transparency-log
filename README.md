# Sentinel Transparency Log

**Proof of Existence. Not Operational Transparency.**

---

## What This Repository Is

This repository publishes **cryptographic existence proofs** of Sentinel's governance state.

### We do not publish

- Risk scores
- Compliance findings
- Repository names
- Policy contents
- Operational metrics

### We publish only

| Field | Description |
| --- | --- |
| `org_anchor_hash` | SHA-256 of the current governance state |
| `signature` | Ed25519 signature of the canonical hash |
| `key_id` | Identifier of the signing key |
| `timestamp` | ISO 8601 publication time |
| `anchor_sequence` | Monotonically increasing sequence number |

Each anchor is:

- **Deterministically generated** — same input always produces same hash
- **Canonically signed** — never raw JSON
- **Verified against a public key registry** — key lifecycle is enforced
- **Append-only** — protected by branch rules, no force-push
- **Independently verifiable** — no database or internal access required

**You do not need to trust us. You can verify us.**

---

## What This Proves

Each anchor proves:

> At time T, a specific governance state existed.

That state includes:

- Policy definitions
- Compliance evaluations
- Federation status across repositories
- Key lifecycle state

**The details remain private. The existence proof is public.**

---

## How To Verify

```bash
git clone https://github.com/rnfck88qng-a11y/sentinel-transparency-log.git
cd sentinel-transparency-log
node verify-transparency.mjs
```

Exit code `0` means:

- ✅ Sequential numbering valid
- ✅ Ed25519 signatures valid
- ✅ No revoked keys used
- ✅ Canonical determinism intact
- ✅ Publication cadence respected

No database access required. No internal systems access required.

---

## Anchor Format

```json
{
  "schema_version": 9,
  "anchor_sequence": 1,
  "timestamp": "2026-02-19T19:33:09.064Z",
  "org_anchor_hash": "f7e13c8c...",
  "source_count": 2,
  "signature": "base64...",
  "key_id": "e67ded56..."
}
```

Anchors are signed using a deterministic canonical string:

```text
schema_version=9|anchor_sequence=1|timestamp=...|org_anchor_hash=...
```

`signature = Ed25519_sign(private_key, sha256(canonical_string))`

---

## Key Management

Public keys are published in `KEYS/org-public-keys.json`.

| Status | Verification Rule |
| --- | --- |
| `ACTIVE` | Signatures accepted |
| `RETIRED` | Historical signatures remain valid |
| `REVOKED` | All signatures from this key are rejected |

Key rotation and revocation events are signed and permanently recorded.

---

## Publication Cadence

Anchors are published on a **weekly** schedule. If a publication window is missed, the next anchor includes `"cadence_violation": true`. Operational imperfections are visible, never hidden.

---

## Trust Model

- **Tamper evidence** — Git history is append-only (protected branch, no force-push)
- **Attribution** — every anchor is signed with an Ed25519 key
- **Independence** — verification requires no internal access
- **Completeness** — sequence numbers prevent silent omission

---

## Repository Structure

```text
anchors/                    Sequential anchor files
KEYS/                       Public key registry
CTP_SPEC.md                 Controlled Transparency Protocol specification
README.md                   This file
verify-transparency.mjs     Standalone verification script
```

---

## Governance Philosophy

Determinism over interpretation.
Proof over assertion.
Discipline over exposure.

This is constitutional governance infrastructure.

---

## Protocol

This log implements the **Controlled Transparency Protocol (CTP) v1**. See [CTP_SPEC.md](CTP_SPEC.md) for the full specification.

---

*Sentinel — Deterministic governance infrastructure.*
