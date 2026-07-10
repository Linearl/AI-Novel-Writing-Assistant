/**
 * AES-256-GCM encrypt / decrypt helpers for API key storage.
 *
 * Ciphertext format: `aes256gcm:` + base64(nonce ‖ tag ‖ ciphertext)
 *
 * The 12-byte nonce is randomly generated per encryption call.
 * Each API key value is unique, so nonce reuse is not a concern.
 */

import crypto from "node:crypto";

const PREFIX = "aes256gcm:";
const NONCE_LENGTH = 12; // 96 bits — GCM recommended nonce size
const TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Detect whether a value is already encrypted (has the `aes256gcm:` prefix).
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Encrypt `plaintext` with the given 256-bit `key` using AES-256-GCM.
 *
 * Returns `aes256gcm:` + base64-encoded concatenated nonce ‖ tag ‖ ciphertext.
 */
export function encryptValue(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, tag, encrypted]);
  return `${PREFIX}${payload.toString("base64")}`;
}

/**
 * Decrypt a value that was encrypted by {@link encryptValue}.
 *
 * Throws if the payload is malformed, the key is wrong, or authentication
 * fails (GCM tag mismatch).
 */
export function decryptValue(ciphertext: string, key: Buffer): string {
  if (!ciphertext.startsWith(PREFIX)) {
    throw new Error("decryptValue: value does not have the aes256gcm: prefix");
  }

  const raw = Buffer.from(ciphertext.slice(PREFIX.length), "base64");

  // Sanity check: at minimum we need nonce + tag (28 bytes) plus some ciphertext
  if (raw.length < NONCE_LENGTH + TAG_LENGTH + 1) {
    throw new Error("decryptValue: ciphertext too short");
  }

  const iv = raw.subarray(0, NONCE_LENGTH);
  const tag = raw.subarray(NONCE_LENGTH, NONCE_LENGTH + TAG_LENGTH);
  const encrypted = raw.subarray(NONCE_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
