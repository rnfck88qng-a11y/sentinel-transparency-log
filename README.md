# Sentinel Transparency Log

**Cryptographic governance existence proofs.**

This repository publishes signed transparency anchors from the Sentinel governance engine. Each anchor proves that a specific governance state existed at a specific time, without revealing operational details.

---

## What Is Published

Each anchor contains **only**:

| Field | Description |
|---|---|
| `org_anchor_hash` | SHA-256 of the current governance state |
| `signature` | Ed25519 signature of the canonical hash |
| `key_id` | Identifier of the signing key |
| `anchor_sequence` | Monotonically increasing sequence number |
| `timestamp` | ISO 8601 publication time |
| `source_count` | Number of federated governance sources |

## What Is NOT Published

- Risk scores
- Repository names
- Policy definitions
- Compliance findings
- Drift events
- Operational metrics

This is **proof of existence**, not operational transparency.

---

## Verification

Anyone can verify this log independently:

```bash
git clone <this-repo>
cd sentinel-transparency-log
node verify-transparency.mjs
```

The verifier checks:

1. **Sequential numbering** — no gaps, no duplicates
2. **Ed25519 signatures** — every anchor cryptographically verified
3. **Key lifecycle** — no anchors signed by revoked keys
4. **Canonical determinism** — same input always produces same hash
5. **Cadence compliance** — missed publication windows are flagged

No database access required. No internal systems access required.

---

## Anchor Format

```json
{
  "schema_version": 9,
  "anchor_sequence": 1,
  "timestamp": "2026-02-19T12:00:00.000Z",
  "org_anchor_hash": "abc123...",
  "source_count": 3,
  "signature": "base64...",
  "key_id": "def456..."
}
```

### Canonical Signing String

Anchors are signed using a deterministic canonical string, never raw JSON:

```
schema_version=9|anchor_sequence=1|timestamp=2026-02-19T12:00:00.000Z|org_anchor_hash=abc123...
```

`signature = Ed25519_sign(private_key, sha256(canonical_string))`

---

## Publication Cadence

Anchors are published on a **weekly** schedule. If a publication window is missed, the next anchor includes a `cadence_violation: true` flag. Operational imperfections are visible, never hidden.

---

## Key Management

Public keys are published in `KEYS/org-public-keys.json`. Key lifecycle states:

| Status | Meaning |
|---|---|
| `ACTIVE` | Signatures accepted |
| `RETIRED` | Historical signatures remain valid |
| `REVOKED` | All signatures from this key are rejected |

Key rotation and revocation events are signed and recorded in the organization's governance ledger.

---

## Trust Model

This log provides **cryptographic accountability**:

- **Tamper evidence**: Git history is append-only (protected branch, no force-push)
- **Attribution**: Every anchor is signed with an Ed25519 key
- **Independence**: Verification requires no internal access
- **Completeness**: Sequence numbers prevent silent omission

---

## Repository Structure

```
anchors/        Sequential anchor files (000001.json, 000002.json, ...)
KEYS/           Public key registry (org-public-keys.json)
CTP_SPEC.md     Controlled Transparency Protocol specification
README.md       This file
verify-transparency.mjs   Standalone verification script
```

---

## Protocol

This log implements the **Controlled Transparency Protocol (CTP) v1**. See [CTP_SPEC.md](CTP_SPEC.md) for the full specification.

---

*Sentinel — Deterministic governance infrastructure.*
