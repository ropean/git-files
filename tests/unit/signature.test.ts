import { describe, it, expect } from "vitest";
import { keygenAsync, signAsync, etc } from "@noble/ed25519";
import { sha256Hex, buildSigningString, verifyEd25519 } from "../../src/backend/lib/signature";

async function bytesToBase64(bytes: Uint8Array): Promise<string> {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

describe("signature", () => {
  it("sha256Hex matches a known digest", async () => {
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await sha256Hex("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("builds the signing string per SEARCH_API_SPEC.md §2.2", () => {
    expect(buildSigningString("POST", "/api/v1/sync/start", "1755385200", "abc")).toBe("POST\n/api/v1/sync/start\n1755385200\nabc");
  });

  it("accepts a signature produced by the matching private key", async () => {
    const { secretKey, publicKey } = await keygenAsync();
    const publicKeyB64 = await bytesToBase64(publicKey);

    const bodyHash = await sha256Hex(JSON.stringify({ runId: "abc" }));
    const message = buildSigningString("POST", "/api/v1/sync/start", "1755385200", bodyHash);
    const signature = await signAsync(new TextEncoder().encode(message), secretKey);
    const signatureB64 = await bytesToBase64(signature);

    expect(await verifyEd25519(publicKeyB64, message, signatureB64)).toBe(true);
  });

  it("rejects a signature when the body was tampered with after signing", async () => {
    const { secretKey, publicKey } = await keygenAsync();
    const publicKeyB64 = await bytesToBase64(publicKey);

    const bodyHash = await sha256Hex(JSON.stringify({ runId: "abc" }));
    const message = buildSigningString("POST", "/api/v1/sync/start", "1755385200", bodyHash);
    const signature = await signAsync(new TextEncoder().encode(message), secretKey);
    const signatureB64 = await bytesToBase64(signature);

    const tamperedBodyHash = await sha256Hex(JSON.stringify({ runId: "tampered" }));
    const tamperedMessage = buildSigningString("POST", "/api/v1/sync/start", "1755385200", tamperedBodyHash);

    expect(await verifyEd25519(publicKeyB64, tamperedMessage, signatureB64)).toBe(false);
  });

  it("rejects a signature verified against the wrong public key", async () => {
    const signer = await keygenAsync();
    const other = await keygenAsync();
    const otherPublicKeyB64 = await bytesToBase64(other.publicKey);

    const bodyHash = await sha256Hex("{}");
    const message = buildSigningString("PUT", "/api/v1/repos/github/ropean/x/files", "1755385200", bodyHash);
    const signature = await signAsync(new TextEncoder().encode(message), signer.secretKey);
    const signatureB64 = await bytesToBase64(signature);

    expect(await verifyEd25519(otherPublicKeyB64, message, signatureB64)).toBe(false);
  });

  it("rejects garbage base64 without throwing", async () => {
    expect(await verifyEd25519("not-valid-base64!!!", "message", "also-not-valid!!!")).toBe(false);
  });

  it("etc.bytesToHex round-trips through hex", () => {
    // sanity check the helper reused from @noble/ed25519 in sha256Hex
    expect(etc.hexToBytes(etc.bytesToHex(new Uint8Array([1, 2, 255])))).toEqual(new Uint8Array([1, 2, 255]));
  });
});
