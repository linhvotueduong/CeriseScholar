// BYOK key vault — encrypt/decrypt helpers for storing a user's own OpenRouter
// API key server-side. See docs/byok-intake-design.md §2b/§4.
//
// AES-256-GCM with a random IV per encryption. The encryption key comes from
// the server-only BYOK_ENCRYPTION_KEY env secret (never NEXT_PUBLIC_, never
// committed) — ciphertext in the database is useless without it. Never log
// plaintext keys or the encryption key itself anywhere in this file.

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // Standard GCM nonce size.
const KEY_LENGTH_BYTES = 32; // AES-256 requires a 32-byte key.

function loadEncryptionKey(): Buffer {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error(
      "Server is missing BYOK_ENCRYPTION_KEY. Generate one with `openssl rand -base64 32` and set it in the server environment."
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw.trim(), "base64");
  } catch {
    throw new Error("BYOK_ENCRYPTION_KEY is not valid base64.");
  }

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `BYOK_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`
    );
  }

  return key;
}

/**
 * Encrypt a plaintext secret (a user's pasted OpenRouter key) for storage.
 * Format: base64(iv).base64(authTag).base64(ciphertext).
 */
export function encryptSecret(plaintext: string): string {
  const key = loadEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/**
 * Decrypt a ciphertext produced by encryptSecret. Throws if the format is
 * malformed or the auth tag does not verify (wrong/rotated key, tampering).
 * Callers must not log the returned plaintext.
 */
export function decryptSecret(ciphertext: string): string {
  const key = loadEncryptionKey();
  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    throw new Error("Stored key is malformed and cannot be decrypted.");
  }

  const [ivPart, authTagPart, dataPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const data = Buffer.from(dataPart, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);

  return plaintext.toString("utf8");
}
