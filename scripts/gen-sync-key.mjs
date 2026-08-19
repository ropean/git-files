#!/usr/bin/env node
/**
 * @title Sync Key Generator
 * @description Generate an Ed25519 keypair for the ingest API (see docs/ED25519-KEYGEN.md)
 * @author Claude Sonnet (Anthropic)
 *
 * Generates a fresh Ed25519 keypair plus a recommended key id, prints all
 * three to stdout, and writes the PEM/public key to the OS temp dir so they
 * can be copied into this repo's own Actions secrets (used by
 * scripts/sync-search-index.mjs) and this app's Settings → Sync keys page
 * without retyping.
 *
 * @example
 * node scripts/gen-sync-key.mjs
 * node scripts/gen-sync-key.mjs my-label
 */

import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const label = process.argv[2] || "git-files";
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const suffix = randomBytes(3).toString("hex");
const keyId = `${label}-${stamp}-${suffix}`;

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicBase64 = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64");

const dir = mkdtempSync(join(tmpdir(), "sync-key-"));
const privatePath = join(dir, `${keyId}.private.pem`);
const publicPath = join(dir, `${keyId}.public.txt`);
writeFileSync(privatePath, privatePem);
writeFileSync(publicPath, publicBase64 + "\n");

console.log(`Key id (SEARCH_API_KEY_ID / Settings "Key id"):\n  ${keyId}\n`);
console.log(`Private key PEM (SEARCH_API_PRIVATE_KEY):\n${privatePem}`);
console.log(`Public key, base64 (Settings "Public key"):\n  ${publicBase64}\n`);
console.log(`Files written to:\n  ${privatePath}\n  ${publicPath}`);
