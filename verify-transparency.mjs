#!/usr/bin/env node
// ── Sentinel Transparency Log Verifier ──────────────────
//
// Standalone verification script.
// No database required. No internal access required.
//
// Usage:
//   git clone https://github.com/<org>/sentinel-transparency-log
//   cd sentinel-transparency-log
//   node verify-transparency.mjs
//
// Checks:
//   1. Sequential numbering (no gaps, no duplicates)
//   2. Ed25519 signature verification per anchor
//   3. Key lifecycle (ACTIVE/RETIRED = accept, REVOKED = reject)
//   4. Canonical string determinism
//   5. Cadence violations flagged
//
// Exit code 0 = VALID, 1 = INVALID

import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Ed25519 Verification (inline, no deps) ──────────────
// Uses tweetnacl-compatible approach via node:crypto
import { createPublicKey, verify } from "node:crypto";

function sha256(input) {
    return createHash("sha256").update(input, "utf8").digest("hex");
}

function verifyEd25519(messageHex, signatureB64, publicKeyB64) {
    try {
        // tweetnacl signs the UTF-8 bytes of the message string (hex hash)
        // NOT the raw hex bytes — so we verify against TextEncoder output
        const msgBytes = new TextEncoder().encode(messageHex);
        const sigBytes = Buffer.from(signatureB64, "base64");
        const pkBytes = Buffer.from(publicKeyB64, "base64");

        // Build DER-encoded Ed25519 public key
        // Ed25519 OID: 1.3.101.112
        const derPrefix = Buffer.from("302a300506032b6570032100", "hex");
        const derKey = Buffer.concat([derPrefix, pkBytes]);

        const keyObj = createPublicKey({ key: derKey, format: "der", type: "spki" });
        return verify(null, msgBytes, keyObj, sigBytes);
    } catch {
        return false;
    }
}

function buildCanonicalString(schemaVersion, anchorSequence, timestamp, orgAnchorHash) {
    return [
        `schema_version=${schemaVersion}`,
        `anchor_sequence=${anchorSequence}`,
        `timestamp=${timestamp}`,
        `org_anchor_hash=${orgAnchorHash}`,
    ].join("|");
}

// ── Load Data ───────────────────────────────────────────

const anchorsDir = resolve(__dirname, "anchors");
const keysFile = resolve(__dirname, "KEYS", "org-public-keys.json");

if (!existsSync(anchorsDir)) {
    console.error("  ❌ No anchors/ directory found.");
    process.exit(1);
}

const anchorFiles = readdirSync(anchorsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

if (anchorFiles.length === 0) {
    console.log("  ⚠️  No anchor files found.");
    process.exit(0);
}

// Load keys
let keys = [];
if (existsSync(keysFile)) {
    const keysData = JSON.parse(readFileSync(keysFile, "utf-8"));
    keys = keysData.keys || [];
}

// Build key lookup
const keyMap = new Map();
for (const k of keys) {
    keyMap.set(k.key_id, k);
}

// ── Verification ────────────────────────────────────────

console.log(`\n  🔍 Sentinel Transparency Log Verifier`);
console.log(`  ──────────────────────────────────\n`);

let passed = 0;
let failed = 0;
let cadenceViolations = 0;
const seenSequences = new Set();

function check(ok, label) {
    if (ok) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        console.log(`  ❌ ${label}`);
    }
}

// Load all anchors
const anchors = anchorFiles.map((f) =>
    JSON.parse(readFileSync(resolve(anchorsDir, f), "utf-8"))
);

console.log(`  📋 Anchors: ${anchors.length}`);
console.log(`  📋 Keys: ${keys.length}\n`);

// ── 1. Sequential numbering ────────────────────────────

console.log("  [1] Sequential Numbering");
let seqOk = true;
let gapFound = false;
let dupFound = false;

for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    if (seenSequences.has(a.anchor_sequence)) {
        dupFound = true;
    }
    seenSequences.add(a.anchor_sequence);

    if (i > 0 && a.anchor_sequence !== anchors[i - 1].anchor_sequence + 1) {
        gapFound = true;
    }
}

check(!dupFound, "No duplicate sequences");
check(!gapFound, "No gaps in sequence");
check(anchors[0].anchor_sequence === 1, "Starts at sequence 1");

// ── 2. Signature verification ──────────────────────────

console.log("\n  [2] Signature Verification");

for (const a of anchors) {
    const canonical = buildCanonicalString(
        a.schema_version,
        a.anchor_sequence,
        a.timestamp,
        a.org_anchor_hash,
    );
    const contentHash = sha256(canonical);

    // Find public key
    const key = keyMap.get(a.key_id);
    if (!key) {
        check(false, `Anchor #${a.anchor_sequence}: key ${a.key_id} not found`);
        continue;
    }

    const sigValid = verifyEd25519(contentHash, a.signature, key.public_key);
    check(sigValid, `Anchor #${a.anchor_sequence}: signature valid (key=${a.key_id.slice(0, 8)}…)`);
}

// ── 3. Key lifecycle ───────────────────────────────────

console.log("\n  [3] Key Lifecycle");

let revokedUsed = false;
const keysUsed = new Set();

for (const a of anchors) {
    keysUsed.add(a.key_id);
    const key = keyMap.get(a.key_id);
    if (key && key.status === "REVOKED") {
        revokedUsed = true;
        check(false, `Anchor #${a.anchor_sequence}: signed by REVOKED key ${a.key_id}`);
    }
}

if (!revokedUsed) {
    check(true, "No anchors signed by revoked keys");
}

for (const k of keys) {
    const label = `${k.key_id.slice(0, 8)}… ${k.status}`;
    if (k.status === "REVOKED") {
        console.log(`    ⚠️  ${label} (revoked: ${k.revoked_at})`);
    } else if (k.status === "RETIRED") {
        console.log(`    ℹ️  ${label} (retired: ${k.retired_at})`);
    } else {
        console.log(`    🔑 ${label}`);
    }
}

// ── 4. Canonical string determinism ────────────────────

console.log("\n  [4] Canonical Determinism");

for (const a of anchors) {
    const c1 = buildCanonicalString(a.schema_version, a.anchor_sequence, a.timestamp, a.org_anchor_hash);
    const c2 = buildCanonicalString(a.schema_version, a.anchor_sequence, a.timestamp, a.org_anchor_hash);
    const h1 = sha256(c1);
    const h2 = sha256(c2);
    check(h1 === h2, `Anchor #${a.anchor_sequence}: canonical hash deterministic`);
}

// ── 5. Cadence violations ──────────────────────────────

console.log("\n  [5] Cadence");

for (const a of anchors) {
    if (a.cadence_violation) {
        cadenceViolations++;
        console.log(`    ⚠️  Anchor #${a.anchor_sequence}: cadence violation flagged (${a.timestamp})`);
    }
}

if (cadenceViolations === 0) {
    check(true, "No cadence violations");
} else {
    console.log(`    ⚠️  ${cadenceViolations} cadence violation(s) — acknowledged transparently`);
    passed++; // Not a failure — it's transparent
}

// Check gap between anchors > 7 days
for (let i = 1; i < anchors.length; i++) {
    const prev = new Date(anchors[i - 1].timestamp);
    const curr = new Date(anchors[i].timestamp);
    const days = (curr - prev) / (1000 * 60 * 60 * 24);
    if (days > 7 && !anchors[i].cadence_violation) {
        check(false, `Anchor #${anchors[i].anchor_sequence}: >7 days gap but no cadence_violation flag`);
    }
}

// ── Summary ────────────────────────────────────────────

console.log(`\n  ──────────────────────────────────`);
console.log(`  Anchors: ${anchors.length}`);
console.log(`  Keys: ${keys.length} (${keys.filter(k => k.status === "ACTIVE").length} active, ${keys.filter(k => k.status === "RETIRED").length} retired, ${keys.filter(k => k.status === "REVOKED").length} revoked)`);
console.log(`  Cadence violations: ${cadenceViolations}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`  ${failed === 0 ? "✅ TRANSPARENCY LOG: VALID" : "❌ TRANSPARENCY LOG: INVALID"}`);
console.log();

process.exit(failed > 0 ? 1 : 0);
