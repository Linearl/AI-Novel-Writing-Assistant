import { prisma } from "../../../db/prisma";
import type { SecretStore, SecretStoreListOptions, SecretStoreRecord, SecretStoreWriteInput } from "./SecretStore";
import { deriveMachineKey } from "../../../platform/deriveMachineKey";
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
 * Returns ciphertext unchanged when machine key is unavailable
 * (callers that need plaintext will receive the encrypted string —
 * this is the graceful degradation path).
 */
async function decryptFromStorage(storedKey: string | null | undefined): Promise<string | null> {
  if (!storedKey) return storedKey ?? null;
  if (!isEncrypted(storedKey)) return storedKey; // plaintext — nothing to decrypt
  const key = await resolveMachineKey();
  if (!key) return storedKey; // cannot decrypt; caller sees ciphertext
  try {
    return decryptValue(storedKey, key);
  } catch (error) {
    logger.warn("[secretStore] Failed to decrypt API key — returning ciphertext. Error:", error);
    return storedKey;
  }
}

/**
 * One-time migration: encrypt any existing plaintext API keys.
 *
 * Runs lazily on first store access and silently skips records that are
 * already encrypted or when the machine key is unavailable.
 */
async function migrateExistingKeys(): Promise<void> {
  if (migrated) return;
  migrated = true;

  const key = await resolveMachineKey();
  if (!key) return; // cannot encrypt — nothing to migrate

  const records = await prisma.aPIKey.findMany();
  let encryptedCount = 0;

  for (const record of records) {
    if (!record.key || isEncrypted(record.key)) continue;
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
  }

  if (encryptedCount > 0) {
    logger.info(`[secretStore] Migrated ${encryptedCount} plaintext API key(s) to encrypted storage.`);
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
