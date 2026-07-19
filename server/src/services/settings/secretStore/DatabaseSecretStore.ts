import { prisma } from "../../../db/prisma";
import type { SecretStore, SecretStoreListOptions, SecretStoreRecord, SecretStoreWriteInput } from "./SecretStore";
import { deriveMachineKey, legacyDeriveMachineKey } from "../../../platform/deriveMachineKey";
import { encryptValue, decryptValue, isEncrypted } from "../../../platform/encryptKey";
import { logger } from "../../logging/LoggerService";

/** Lazily resolved machine key; `null` when machine fingerprint derivation fails. */
let machineKey: Buffer | null | undefined;

/** One-time migration guard — avoids re-scanning on every process start. */
let migrated = false;

/**
 * Resolve the machine-derived AES key (cached after first call).
 *
 * Returns `null` when machine fingerprinting is unavailable; the caller
 * must fall back to plaintext storage in that case.
 */
async function resolveMachineKey(): Promise<Buffer | null> {
  if (machineKey !== undefined) {
    return machineKey;
  }
  machineKey = await deriveMachineKey();
  if (machineKey === null) {
    logger.warn(
      "[secretStore] Machine fingerprint unavailable — API keys will be stored in plaintext. " +
      "Re-encryption will be attempted on next process restart.",
    );
  }
  return machineKey;
}

/**
 * Encrypt a key value for storage.
 *
 * Returns `null` for null/empty input (no key configured).
 * Falls back to plaintext when the machine key is unavailable.
 */
async function encryptForStorage(plainKey: string | null | undefined): Promise<string | null> {
  if (!plainKey) return null;
  const key = await resolveMachineKey();
  if (!key) return plainKey; // fallback to plaintext
  return encryptValue(plainKey, key);
}

/**
 * Decrypt a key value read from storage.
 *
 * Returns null/undefined inputs unchanged.
 * Returns plaintext values unchanged.
 *
 * When decryption fails (e.g. key source changed), returns `null` instead
 * of the ciphertext. This prevents callers from sending encrypted blobs
 * to LLM providers as "API keys".
 */
async function decryptFromStorage(storedKey: string | null | undefined): Promise<string | null> {
  if (!storedKey) return storedKey ?? null;
  if (!isEncrypted(storedKey)) return storedKey; // plaintext - nothing to decrypt
  const key = await resolveMachineKey();
  if (!key) {
    logger.warn(
      "[secretStore] Cannot decrypt API key — machine key unavailable. " +
      "The key needs to be re-configured via the settings page.",
    );
    return null;
  }
  try {
    return decryptValue(storedKey, key);
  } catch (error) {
    logger.warn(
      "[secretStore] Failed to decrypt API key — the encryption key source may have changed. " +
      "The key needs to be re-configured via the settings page. Error:",
      error,
    );
    return null;
  }
}

/**
 * Try to decrypt a value with the legacy MAC-based key, then re-encrypt
 * with the current (stable) key.
 *
 * Returns the re-encrypted value on success, or `null` if the legacy
 * key is also unavailable or decryption fails.
 */
async function tryMigrateWithLegacyKey(ciphertext: string): Promise<string | null> {
  const currentKey = await resolveMachineKey();
  if (!currentKey) return null;

  const legacyKey = await legacyDeriveMachineKey();
  if (!legacyKey) return null;

  try {
    const plaintext = decryptValue(ciphertext, legacyKey);
    // Re-encrypt with the current stable key
    const reEncrypted = encryptValue(plaintext, currentKey);
    return reEncrypted;
  } catch {
    // Legacy key also cannot decrypt - give up
    return null;
  }
}

/**
 * One-time migration: encrypt any existing plaintext API keys and
 * re-encrypt keys that were encrypted with the old MAC-based fingerprint.
 *
 * Runs lazily on first store access. For each record:
 * 1. Already encrypted with current key -> skip
 * 2. Plaintext -> encrypt with current key
 * 3. Encrypted with old key (current key fails) -> try legacy key -> re-encrypt
 * 4. Neither key works -> clear the key (user must re-configure)
 */
async function migrateExistingKeys(): Promise<void> {
  if (migrated) return;
  migrated = true;

  const key = await resolveMachineKey();
  if (!key) return; // cannot encrypt - nothing to migrate

  const records = await prisma.aPIKey.findMany();
  let encryptedCount = 0;
  let migratedFromLegacyCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    if (!record.key) continue;

    // Case 1: plaintext - encrypt with current key
    if (!isEncrypted(record.key)) {
      try {
        const encrypted = encryptValue(record.key, key);
        await prisma.aPIKey.update({
          where: { provider: record.provider },
          data: { key: encrypted } as never,
        });
        encryptedCount += 1;
      } catch (error) {
        logger.warn(
          `[secretStore] Failed to encrypt key for provider "${record.provider}" — leaving as plaintext.`,
          error,
        );
      }
      continue;
    }

    // Case 2: already encrypted - verify it decrypts with current key
    try {
      decryptValue(record.key, key);
      continue; // current key works - nothing to do
    } catch {
      // Current key cannot decrypt - try legacy migration
    }

    // Case 3: try legacy MAC-based key
    const reEncrypted = await tryMigrateWithLegacyKey(record.key);
    if (reEncrypted) {
      await prisma.aPIKey.update({
        where: { provider: record.provider },
        data: { key: reEncrypted } as never,
      });
      migratedFromLegacyCount += 1;
      logger.info(
        `[secretStore] Migrated key for provider "${record.provider}" from legacy MAC-based encryption.`,
      );
      continue;
    }

    // Case 4: neither key works - preserve ciphertext, skip clearing
    // Data protection: do NOT destroy un-decryptable records; the read path
    // already returns null, so the UI will prompt the user to re-configure.
    skippedCount += 1;
    logger.warn(
      `[secretStore] Could not decrypt key for provider "${record.provider}" with either current or legacy key. ` +
      `Original ciphertext preserved — please re-configure via the settings page.`,
    );
  }

  if (encryptedCount > 0) {
    logger.info(`[secretStore] Migrated ${encryptedCount} plaintext API key(s) to encrypted storage.`);
  }
  if (migratedFromLegacyCount > 0) {
    logger.info(`[secretStore] Re-encrypted ${migratedFromLegacyCount} API key(s) from legacy MAC-based fingerprint.`);
  }
  if (skippedCount > 0) {
    logger.warn(
      `[secretStore] Skipped ${skippedCount} API key(s) that could not be decrypted — ciphertext preserved. ` +
      `Please re-configure them via the settings page.`,
    );
  }
}

function toPrismaWriteInput(input: SecretStoreWriteInput): Record<string, unknown> {
  return {
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.baseURL !== undefined ? { baseURL: input.baseURL } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.reasoningEnabled !== undefined ? { reasoningEnabled: input.reasoningEnabled } : {}),
    ...(input.concurrencyLimit !== undefined ? { concurrencyLimit: input.concurrencyLimit } : {}),
    ...(input.requestIntervalMs !== undefined ? { requestIntervalMs: input.requestIntervalMs } : {}),
    ...(input.rpm !== undefined ? { rpm: input.rpm } : {}),
    ...(input.tpm !== undefined ? { tpm: input.tpm } : {}),
  };
}

export class DatabaseSecretStore implements SecretStore {
  /** Lazily ensure existing plaintext keys are encrypted. */
  private async ensureMigrated(): Promise<void> {
    await migrateExistingKeys();
  }

  async listProviders(options?: SecretStoreListOptions): Promise<SecretStoreRecord[]> {
    await this.ensureMigrated();
    const records = await prisma.aPIKey.findMany({
      where: {
        ...(options?.onlyActive ? { isActive: true } : {}),
        ...(options?.providers?.length
          ? {
            provider: {
              in: options.providers,
            },
          }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const results: SecretStoreRecord[] = [];
    for (const record of records) {
      results.push({
        ...record,
        key: await decryptFromStorage(record.key),
      });
    }
    return results;
  }

  async getProvider(provider: string): Promise<SecretStoreRecord | null> {
    await this.ensureMigrated();
    const record = await prisma.aPIKey.findUnique({
      where: { provider },
    });
    if (!record) return null;
    return {
      ...record,
      key: await decryptFromStorage(record.key),
    };
  }

  async hasProvider(provider: string): Promise<boolean> {
    const existing = await prisma.aPIKey.findUnique({
      where: { provider },
      select: { id: true },
    });
    return existing != null;
  }

  async createProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    await this.ensureMigrated();
    const encryptedKey = await encryptForStorage(input.key);
    const writeInput = toPrismaWriteInput({ ...input, key: encryptedKey });
    const record = await prisma.aPIKey.create({
      data: ({
        provider,
        ...writeInput,
      } as Record<string, unknown>) as never,
    });
    return {
      ...record,
      key: await decryptFromStorage(record.key),
    };
  }

  async updateProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    await this.ensureMigrated();
    const encryptedKey = await encryptForStorage(input.key);
    const writeInput = toPrismaWriteInput({ ...input, key: encryptedKey });
    const record = await prisma.aPIKey.update({
      where: { provider },
      data: writeInput as never,
    });
    return {
      ...record,
      key: await decryptFromStorage(record.key),
    };
  }

  async upsertProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    await this.ensureMigrated();
    const encryptedKey = await encryptForStorage(input.key);
    const writeInput = toPrismaWriteInput({ ...input, key: encryptedKey });
    const record = await prisma.aPIKey.upsert({
      where: { provider },
      update: writeInput as never,
      create: ({
        provider,
        ...writeInput,
      } as Record<string, unknown>) as never,
    });
    return {
      ...record,
      key: await decryptFromStorage(record.key),
    };
  }

  async deleteProvider(provider: string): Promise<void> {
    await prisma.aPIKey.delete({
      where: { provider },
    });
  }
}
