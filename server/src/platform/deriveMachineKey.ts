/**
 * Stable machine identity key derivation.
 *
 * Derives a 256-bit key from hostname + OS user + a platform-specific
 * stable machine identifier:
 *   - Windows:  HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
 *   - Linux:    /etc/machine-id
 *   - macOS:    IOPlatformUUID via ioreg
 *
 * The previous MAC-based fingerprint was unstable in multi-NIC environments
 * (WSL/Hyper-V, VPN, WiFi) because `os.networkInterfaces()` iteration
 * order is not guaranteed across restarts.
 *
 * The key is NOT persisted — it lives only in memory and is re-derived each
 * time the process starts, so it changes if the machine identity changes.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ALGORITHM = "sha256";

/**
 * Read the Windows MachineGuid from the registry.
 *
 * Returns `null` when not on Windows or when the registry key cannot be read.
 */
async function getWindowsMachineGuid(): Promise<string | null> {
  if (os.platform() !== "win32") return null;
  try {
    const { stdout } = await execFileAsync("reg", [
      "query",
      "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
      "/v",
      "MachineGuid",
    ], { encoding: "utf8" });
    // Output format: "    MachineGuid    REG_SZ    {guid}"
    const match = stdout.match(/MachineGuid\s+REG_SZ\s+([^\s]+)/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Read the Linux machine-id from /etc/machine-id.
 *
 * Returns `null` when not on Linux or when the file cannot be read.
 */
function getLinuxMachineId(): string | null {
  if (os.platform() !== "linux") return null;
  try {
    return fs.readFileSync("/etc/machine-id", "utf8").trim() || null;
  } catch {
    // Fallback: /var/lib/dbus/machine-id (older distros)
    try {
      return fs.readFileSync("/var/lib/dbus/machine-id", "utf8").trim() || null;
    } catch {
      return null;
    }
  }
}

/**
 * Read the macOS IOPlatformUUID via ioreg.
 *
 * Returns `null` when not on macOS or when the command fails.
 */
async function getMacOsPlatformUuid(): Promise<string | null> {
  if (os.platform() !== "darwin") return null;
  try {
    const { stdout } = await execFileAsync("ioreg", [
      "-rd1",
      "-c",
      "IOPlatformExpertDevice",
    ], { encoding: "utf8" });
    const match = stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a platform-specific stable machine identifier.
 *
 * Returns `null` if the platform identifier cannot be resolved, signalling
 * that the caller should fall back to plaintext storage.
 */
async function getStableMachineId(): Promise<string | null> {
  // Try each platform in order; the non-matching ones return null quickly
  return (
    (await getWindowsMachineGuid())
    ?? getLinuxMachineId()
    ?? (await getMacOsPlatformUuid())
    ?? null
  );
}

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
    const machineId = await getStableMachineId();

    if (!hostname || !username || !machineId) {
      return null;
    }

    return `${hostname}:${username}:${machineId}`;
  } catch {
    return null;
  }
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
 * is expected to change.
 */
export function resetMachineKeyCache(): void {
  cachedKey = undefined;
}

// ---------------------------------------------------------------------------
// Legacy MAC-based key derivation (for migration only)
// ---------------------------------------------------------------------------

/**
 * Extract the primary non-internal MAC address.
 *
 * @deprecated Only used by {@link legacyDeriveMachineKey} for one-time
 * migration of API keys encrypted with the old MAC-based fingerprint.
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

let legacyCachedKey: Buffer | null | undefined;

/**
 * Derive a key using the old MAC-based fingerprint.
 *
 * @deprecated This function exists solely for the migration path in
 * `DatabaseSecretStore.migrateExistingKeys()` — it allows re-encrypting
 * keys that were stored under the old fingerprint.
 */
export async function legacyDeriveMachineKey(): Promise<Buffer | null> {
  if (legacyCachedKey !== undefined) {
    return legacyCachedKey;
  }

  try {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const mac = getPrimaryMacAddress();

    if (!hostname || !username || !mac) {
      legacyCachedKey = null;
      return null;
    }

    const fingerprint = `${hostname}:${username}:${mac}`;
    const hash = crypto.createHash(ALGORITHM).update(fingerprint).digest();
    legacyCachedKey = hash;
    return hash;
  } catch {
    legacyCachedKey = null;
    return null;
  }
}
