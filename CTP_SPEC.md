# Controlled Transparency Protocol (CTP) v1

> **Status:** FROZEN  
> **Schema:** v9  
> **Scope:** Public anchor publication + proof bundles

---

## I. What Gets Published

**Only this:**

```json
{
  "schema_version": 9,
  "anchor_sequence": 12,
  "timestamp": "2026-02-19T12:00:00Z",
  "org_anchor_hash": "abc123...",
  "source_count": 3,
  "signature": "base64...",
  "key_id": "def456..."
}
```

**Not published:** risk scores, repo names, policy sets, findings, drift details.

Proof of existence — not operational detail.

---

## II. Canonical Signing

You do NOT sign JSON. You sign:

```text
schema_version=9|anchor_sequence=12|timestamp=2026-02-19T12:00:00Z|org_anchor_hash=abc123...
```

Then: `signature = Ed25519_sign(sk, sha256(canonical_string))`

---

## III. Publication Channel

Anchors stored as sequential files:

```text
transparency/anchors/000001.json
transparency/anchors/000002.json
...
```

Recommended public channel: **protected Git branch** (no force-push).

---

## IV. Anchor Cadence

**Weekly** (recommended). Alternatives: every 100 scans, every 24h, on policy change.

---

## V. Verification

```text
1. Verify signature: Ed25519_verify(pk, sha256(canonical_string), sig)
2. Confirm key_id = sha256(public_key).slice(0,16)
3. Confirm key status is ACTIVE or RETIRED
4. If bundle org_anchor_hash == published anchor → state existed at anchor time
```

---

## VI. Failure Model

- Signing fails → abort publication
- Verification fails → do not publish
- Key revoked → rotate before next anchor
- Missed cadence → publish immediately + annotate
- **Never backfill silently**

---

## VII. Proof Bundles

Self-contained verification artifact:

```bash
sentinel proof --bundle
# or: POST /proof/bundle
```

Contains: latest anchor, public keys, federation summary, proof results, verification instructions.

Anyone can verify without DB access.

---

## VIII. Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/transparency/publish` | Publish new anchor |
| GET | `/transparency/latest` | Latest anchor |
| GET | `/transparency/anchors` | All anchors |
| POST | `/transparency/verify` | Verify anchor signature |
| POST | `/proof/bundle` | Generate proof bundle |
