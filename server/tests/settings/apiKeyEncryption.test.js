/**
 * REQ-7084: API Key encryption unit tests.
 *
 * Tests the encrypt/decrypt round-trip, isEncrypted detection,
 * and the key-source-change failure mode (decrypt with wrong key).
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  isEncrypted,
  encryptValue,
  decryptValue,
} = require("../../dist/platform/encryptKey.js");

describe("REQ-7084: API Key encryption", () => {
  const testKey = crypto.randomBytes(32); // 256-bit key
  const wrongKey = crypto.randomBytes(32);

  it("isEncrypted detects aes256gcm: prefix", () => {
    assert.equal(isEncrypted("aes256gcm:abc"), true);
    assert.equal(isEncrypted("sk-plaintext-key"), false);
    assert.equal(isEncrypted(""), false);
  });

  it("encrypt/decrypt round-trip preserves plaintext", () => {
    const plaintext = "sk-test-api-key-12345";
    const encrypted = encryptValue(plaintext, testKey);

    assert.ok(isEncrypted(encrypted), "result should have aes256gcm: prefix");
    assert.notEqual(encrypted, plaintext, "encrypted should differ from plaintext");

    const decrypted = decryptValue(encrypted, testKey);
    assert.equal(decrypted, plaintext);
  });

  it("decrypt with wrong key throws (GCM auth failure)", () => {
    const plaintext = "sk-secret-key";
    const encrypted = encryptValue(plaintext, testKey);

    assert.throws(
      () => decryptValue(encrypted, wrongKey),
      /authentication|auth|Unsupported state/i,
      "decrypting with wrong key should throw GCM auth error",
    );
  });

  it("encrypt produces unique ciphertext for same plaintext (random nonce)", () => {
    const plaintext = "sk-same-input";
    const enc1 = encryptValue(plaintext, testKey);
    const enc2 = encryptValue(plaintext, testKey);

    assert.notEqual(enc1, enc2, "each encryption should use a unique nonce");
    // Both should still decrypt to the same value
    assert.equal(decryptValue(enc1, testKey), plaintext);
    assert.equal(decryptValue(enc2, testKey), plaintext);
  });

  it("decrypt malformed ciphertext throws", () => {
    assert.throws(
      () => decryptValue("aes256gcm:AAAA", testKey),
      /too short|ciphertext/i,
    );
  });

  it("decrypt non-encrypted value throws prefix error", () => {
    assert.throws(
      () => decryptValue("not-encrypted", testKey),
      /prefix/i,
    );
  });
});
