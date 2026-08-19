import { verifyAsync, etc } from "@noble/ed25519";

/**
 * sha256hex of the raw request body, as required by SEARCH_API_SPEC.md §2.2's
 * signing string. Uses WebCrypto directly — SHA-256 digest is a ubiquitous,
 * uncontroversial primitive in the Workers runtime (unlike Ed25519 support
 * in `crypto.subtle`, which is why signature verification below goes
 * through @noble/ed25519 instead).
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return etc.bytesToHex(new Uint8Array(digest));
}

export function buildSigningString(method: string, path: string, timestamp: string, bodyHashHex: string): string {
  return `${method}\n${path}\n${timestamp}\n${bodyHashHex}`;
}

/**
 * Verifies an Ed25519 signature over `message` using a base64-encoded raw
 * 32-byte public key and a base64-encoded signature (SEARCH_API_SPEC.md §2.2).
 * `verifyAsync` hashes internally via WebCrypto SHA-512 (not the WebCrypto
 * Ed25519 algorithm), so this works uniformly across workerd/Node without
 * depending on the runtime's Ed25519 WebCrypto support.
 */
export async function verifyEd25519(publicKeyBase64: string, message: string, signatureBase64: string): Promise<boolean> {
  try {
    const publicKey = base64ToBytes(publicKeyBase64);
    const signature = base64ToBytes(signatureBase64);
    const messageBytes = new TextEncoder().encode(message);
    return await verifyAsync(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
