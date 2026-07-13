import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { prisma } from "../../../db/prisma";
import { setProviderSecretCache } from "../../../llm/factory";
import { refreshProviderModels } from "../../../llm/modelCatalog";
import {
  getProviderEnvApiKey,
  getProviderEnvBaseUrl,
  getProviderEnvModel,
  isBuiltInProvider,
  providerRequiresApiKey,
  PROVIDERS,
  SUPPORTED_PROVIDERS,
} from "../../../llm/providers";
import { AppError } from "../../../middleware/errorHandler";
import { validate } from "../../../middleware/validate";
import { providerBalanceService } from "../../../services/settings/ProviderBalanceService";
import { secretStore } from "../../../services/settings/secretStore";
import {
  getDefaultImageModel,
  getImageModelOptions,
  getProviderImageModelMap,
  saveProviderImageModel,
} from "../../../services/settings/ProviderImageSettingsService";
import type { BuiltinLLMProvider } from "@ai-novel/shared";
import {
  type APIKeyRecordLike,
  type BuiltInProviderStatus,
  type CustomProviderStatus,
  normalizeOptionalText,
  normalizeProviderLimit,
  getFallbackModels,
  getAllPersistedModels,
  providerSchema,
  upsertApiKeySchema,
} from "./sharedTypes";

function buildBuiltInProviderStatus(
  provider: BuiltinLLMProvider,
  item: {
    displayName?: string | null;
    key?: string | null;
    model?: string | null;
    baseURL?: string | null;
    isActive?: boolean;
    reasoningEnabled?: boolean | null;
    concurrencyLimit?: number | null;
    requestIntervalMs?: number | null;
  } | undefined,
  imageModel: string | undefined,
  persistedModels: string[] = [],
): BuiltInProviderStatus {
  const savedKey = normalizeOptionalText(item?.key);
  const envKey = getProviderEnvApiKey(provider);
  const effectiveKey = savedKey ?? envKey;
  const savedBaseURL = normalizeOptionalText(item?.baseURL);
  const configuredModel = normalizeOptionalText(item?.model) ?? getProviderEnvModel(provider);
  const currentBaseURL = savedBaseURL
    ?? getProviderEnvBaseUrl(provider)
    ?? PROVIDERS[provider].baseURL;
  const requiresApiKey = providerRequiresApiKey(provider);
  const fallbackModels = getFallbackModels(provider, configuredModel);
  const models = persistedModels.length > 0
    ? Array.from(new Set([...persistedModels, ...fallbackModels]))
    : fallbackModels;
  const currentModel = configuredModel ?? models[0] ?? "";
  const currentImageModel = imageModel ?? getDefaultImageModel(provider) ?? null;
  const isConfigured = requiresApiKey ? Boolean(effectiveKey && currentModel) : Boolean(currentModel && currentBaseURL);

  return {
    provider,
    kind: "builtin",
    name: PROVIDERS[provider].name,
    displayName: undefined,
    currentModel,
    currentImageModel,
    currentBaseURL,
    models,
    imageModels: Array.from(new Set([...getImageModelOptions(provider), currentImageModel ?? ""].filter(Boolean))),
    defaultModel: PROVIDERS[provider].defaultModel,
    defaultImageModel: getDefaultImageModel(provider) ?? null,
    defaultBaseURL: PROVIDERS[provider].baseURL,
    requiresApiKey,
    isConfigured,
    isActive: item?.isActive ?? isConfigured,
    reasoningEnabled: item?.reasoningEnabled ?? true,
    concurrencyLimit: normalizeProviderLimit(item?.concurrencyLimit),
    requestIntervalMs: normalizeProviderLimit(item?.requestIntervalMs),
    supportsImageGeneration: Boolean(currentImageModel),
  };
}

function buildCustomProviderStatus(item: {
  provider: string;
  displayName: string | null;
  key: string | null;
  model: string | null;
  baseURL: string | null;
  isActive: boolean;
  reasoningEnabled?: boolean | null;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
}, imageModel: string | undefined): CustomProviderStatus {
  const currentModel = normalizeOptionalText(item.model) ?? "";
  const currentBaseURL = normalizeOptionalText(item.baseURL) ?? "";
  const models = currentModel ? [currentModel] : [];
  return {
    provider: item.provider,
    kind: "custom",
    name: normalizeOptionalText(item.displayName) ?? item.provider,
    displayName: normalizeOptionalText(item.displayName) ?? item.provider,
    currentModel,
    currentImageModel: imageModel ?? null,
    currentBaseURL,
    models,
    imageModels: imageModel ? [imageModel] : [],
    defaultModel: currentModel,
    defaultImageModel: null,
    defaultBaseURL: currentBaseURL,
    requiresApiKey: false,
    isConfigured: Boolean(currentModel && currentBaseURL),
    isActive: item.isActive,
    reasoningEnabled: item.reasoningEnabled ?? true,
    concurrencyLimit: normalizeProviderLimit(item.concurrencyLimit),
    requestIntervalMs: normalizeProviderLimit(item.requestIntervalMs),
    supportsImageGeneration: Boolean(imageModel),
  };
}

export function registerProviderRoutes(router: Router): void {
  router.get("/api-keys", async (_req, res, next) => {
    try {
      const keys = await secretStore.listProviders();
      const keyMap = new Map(keys.map((item) => [item.provider, item]));
      const allProviders = Array.from(new Set([
        ...SUPPORTED_PROVIDERS,
        ...keys.map((item) => item.provider),
      ]));
      const imageModelMap = await getProviderImageModelMap(allProviders);
      const persistedModelEntries = await Promise.all(
        SUPPORTED_PROVIDERS.map(async (provider) => [provider, await getAllPersistedModels(provider)] as const),
      );
      const persistedModelMap = new Map(persistedModelEntries);
      const builtInProviders = SUPPORTED_PROVIDERS.map((provider) =>
        buildBuiltInProviderStatus(provider, keyMap.get(provider), imageModelMap.get(provider), persistedModelMap.get(provider) ?? []),
      );
      const customProviders = keys
        .filter((item) => !isBuiltInProvider(item.provider))
        .map((item) => buildCustomProviderStatus(item, imageModelMap.get(item.provider)));
      const data = [...builtInProviders, ...customProviders];
      res.status(200).json({
        success: true,
        data,
        message: "厂商配置已加载。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get("/api-keys/balances", async (_req, res, next) => {
    try {
      const keys = await secretStore.listProviders({ providers: SUPPORTED_PROVIDERS });
      const keyMap = new Map(
        SUPPORTED_PROVIDERS.map((provider) => {
          const record = keys.find((item) => item.provider === provider);
          return [provider, normalizeOptionalText(record?.key) ?? getProviderEnvApiKey(provider)] as const;
        }),
      );
      const data = await providerBalanceService.listBalances(keyMap);
      res.status(200).json({
        success: true,
        data,
        message: "Loaded provider balances.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.put(
    "/api-keys/:provider",
    validate({ params: providerSchema, body: upsertApiKeySchema }),
    async (req, res, next) => {
      try {
        const { provider } = req.params as z.infer<typeof providerSchema>;
        const body = req.body as z.infer<typeof upsertApiKeySchema>;
        const existing = await secretStore.getProvider(provider);
        const existingRecord = existing as APIKeyRecordLike | null;
        if (!isBuiltInProvider(provider) && !existing) {
          throw new AppError("没有找到这个自定义厂商。", 404);
        }

        const nextKey = normalizeOptionalText(body.key) ?? normalizeOptionalText(existingRecord?.key);
        const envKey = getProviderEnvApiKey(provider);
        const effectiveKey = nextKey ?? envKey;
        const nextModel = normalizeOptionalText(body.model) ?? normalizeOptionalText(existingRecord?.model);
        const nextBaseURL = body.baseURL !== undefined
          ? normalizeOptionalText(body.baseURL)
          : normalizeOptionalText(existingRecord?.baseURL);
        const nextDisplayName = !isBuiltInProvider(provider)
          ? normalizeOptionalText(body.displayName) ?? normalizeOptionalText(existingRecord?.displayName) ?? provider
          : undefined;
        const nextReasoningEnabled = body.reasoningEnabled ?? existingRecord?.reasoningEnabled ?? true;
        const nextConcurrencyLimit = body.concurrencyLimit ?? normalizeProviderLimit(existingRecord?.concurrencyLimit);
        const nextRequestIntervalMs = body.requestIntervalMs ?? normalizeProviderLimit(existingRecord?.requestIntervalMs);
        const requiresApiKey = providerRequiresApiKey(provider);

        if (requiresApiKey && !effectiveKey) {
          throw new AppError("请先填写 API Key。", 400);
        }
        if (!isBuiltInProvider(provider) && !nextModel) {
          throw new AppError("请先为自定义厂商选择或填写默认模型。", 400);
        }
        if (!isBuiltInProvider(provider) && !nextBaseURL) {
          throw new AppError("请先填写自定义厂商的 API URL。", 400);
        }

        const data = (isBuiltInProvider(provider)
          ? await secretStore.upsertProvider(provider, {
            key: nextKey ?? null,
            model: nextModel ?? null,
            baseURL: nextBaseURL ?? null,
            isActive: body.isActive ?? true,
            reasoningEnabled: nextReasoningEnabled,
            concurrencyLimit: nextConcurrencyLimit,
            requestIntervalMs: nextRequestIntervalMs,
          })
          : await secretStore.updateProvider(provider, {
            displayName: nextDisplayName,
            key: nextKey ?? null,
            model: nextModel ?? null,
            baseURL: nextBaseURL ?? null,
            isActive: body.isActive ?? existingRecord?.isActive ?? true,
            reasoningEnabled: nextReasoningEnabled,
            concurrencyLimit: nextConcurrencyLimit,
            requestIntervalMs: nextRequestIntervalMs,
          })) as APIKeyRecordLike;

        const currentImageModel = body.imageModel !== undefined
          ? await saveProviderImageModel(provider, body.imageModel)
          : await getProviderImageModelMap([provider]).then((map) => map.get(provider) ?? null);
        const imageModels = Array.from(new Set([
          ...getImageModelOptions(provider),
          currentImageModel ?? "",
        ].filter(Boolean)));

        setProviderSecretCache(provider, data.isActive ? {
          displayName: data.displayName ?? undefined,
          key: data.key ?? undefined,
          model: data.model ?? undefined,
          baseURL: data.baseURL ?? undefined,
          reasoningEnabled: data.reasoningEnabled ?? true,
          concurrencyLimit: data.concurrencyLimit ?? 0,
          requestIntervalMs: data.requestIntervalMs ?? 0,
        } : null);

        let models = getFallbackModels(provider, data.model ?? undefined);
        let message = "厂商配置已保存。";
        try {
          models = await refreshProviderModels(provider, effectiveKey, nextBaseURL ?? getProviderEnvBaseUrl(provider));
        } catch {
          message = "厂商配置已保存，但模型列表刷新失败。可以稍后在厂商卡片中刷新。";
        }

        res.status(200).json({
          success: true,
          data: {
            provider: data.provider,
            displayName: data.displayName,
            model: data.model,
            imageModel: currentImageModel ?? null,
            baseURL: data.baseURL,
            isActive: data.isActive,
            reasoningEnabled: data.reasoningEnabled ?? true,
            concurrencyLimit: normalizeProviderLimit(data.concurrencyLimit),
            requestIntervalMs: normalizeProviderLimit(data.requestIntervalMs),
            models,
            imageModels,
            supportsImageGeneration: Boolean(currentImageModel),
          },
          message,
        } satisfies ApiResponse<{
          provider: string;
          displayName: string | null;
          model: string | null;
          imageModel: string | null;
          baseURL: string | null;
          isActive: boolean;
          reasoningEnabled: boolean;
          concurrencyLimit: number;
          requestIntervalMs: number;
          models: string[];
          imageModels: string[];
          supportsImageGeneration: boolean;
        }>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/api-keys/:provider/refresh-balance",
    validate({ params: providerSchema }),
    async (req, res, next) => {
      try {
        const { provider } = req.params as z.infer<typeof providerSchema>;
        if (!isBuiltInProvider(provider)) {
          throw new AppError("自定义厂商暂不支持刷新余额。", 400);
        }
        const keyConfig = await secretStore.getProvider(provider);
        const data = await providerBalanceService.getProviderBalance({
          provider,
          apiKey: normalizeOptionalText(keyConfig?.key) ?? getProviderEnvApiKey(provider),
        });
        res.status(200).json({
          success: true,
          data,
          message: data.status === "available" ? "Refreshed provider balance." : data.message,
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/api-keys/:provider/refresh-models",
    validate({ params: providerSchema }),
    async (req, res, next) => {
      try {
        const { provider } = req.params as z.infer<typeof providerSchema>;
        const keyConfig = await secretStore.getProvider(provider);
        const effectiveKey = normalizeOptionalText(keyConfig?.key) ?? getProviderEnvApiKey(provider);
        if (providerRequiresApiKey(provider) && !effectiveKey) {
          throw new AppError("请先配置 API Key，再刷新模型列表。", 400);
        }
        const models = await refreshProviderModels(
          provider,
          effectiveKey,
          normalizeOptionalText(keyConfig?.baseURL) ?? getProviderEnvBaseUrl(provider),
        );
        const currentModel = normalizeOptionalText(keyConfig?.model)
          ?? getProviderEnvModel(provider)
          ?? (isBuiltInProvider(provider) ? PROVIDERS[provider].defaultModel : "");
        res.status(200).json({
          success: true,
          data: {
            provider,
            models,
            currentModel,
          },
          message: "模型列表已刷新。",
        } satisfies ApiResponse<{
          provider: string;
          models: string[];
          currentModel: string;
        }>);
      } catch (error) {
        if (error instanceof Error && /failed|empty/i.test(error.message)) {
          next(new AppError(error.message, 400));
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    "/api-keys/:provider/persist-models",
    validate({ params: providerSchema }),
    async (req, res, next) => {
      try {
        const { provider } = req.params as z.infer<typeof providerSchema>;
        const { models } = req.body as { models?: string[] };
        if (!Array.isArray(models) || models.length === 0) {
          throw new AppError("模型列表不能为空。", 400);
        }
        const key = `provider.persistedModels.${provider}`;
        await prisma.appSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(models) },
          create: { key, value: JSON.stringify(models) },
        });
        res.status(200).json({
          success: true,
          data: { provider, models },
          message: `已保存 ${models.length} 个模型到本地。`,
        });
      } catch (error) {
        next(error);
      }
    },
  );
}
