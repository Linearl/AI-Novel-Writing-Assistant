/**
 * Machine fingerprint key derivation.
 *
 * Derives a 256-bit key from hostname + OS user + primary MAC address.
 * The key is NOT persisted — it lives only in memory and is re-derived each
 * time the process starts, so it changes if the machine identity changes.
 */

import crypto from "node:crypto";
import os from "node:os";

const ALGORITHM = "sha256";

/**
 * Collect machine identity components for key derivation.
 *
 * Returns `null` if any component cannot be resolved, signalling that
 * the caller should fall back to plaintext storage.
 */
async function getMachineFingerprint(): Promise<string | null> {
  try {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const mac = getPrimaryMacAddress();

    if (!hostname || !username || !mac) {
      return null;
    }

    return `${hostname}:${username}:${mac}`;
  } catch {
    return null;
  }
}

/**
 * Extract the primary non-internal MAC address.
 *
 * Returns `null` when the OS cannot provide one (e.g. container sandbox
 * with no network interface exposed to the host).
 */
function getPrimaryMacAddress(): string | null {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (!info.internal && info.mac && info.mac !== "00:00:00:00:00:00") {
        return info.mac;
      }
    }
  }
  return null;
}

let cachedKey: Buffer | null | undefined;

/**
 * Derive a 32-byte (256-bit) AES key from the current machine identity.
 *
 * Returns `null` when any component cannot be resolved, which signals the
 * caller to fall back to plaintext storage with a warning.
 */
export async function deriveMachineKey(): Promise<Buffer | null> {
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const fingerprint = await getMachineFingerprint();
  if (!fingerprint) {
    cachedKey = null;
    return null;
  }

  const hash = crypto.createHash(ALGORITHM).update(fingerprint).digest();
  cachedKey = hash;
  return hash;
}

/**
 * Reset the cached key — useful for testing or when machine identity
 * is expected to change (e.g. MAC address rotation).
 */
export function resetMachineKeyCache(): void {
  cachedKey = undefined;
}
