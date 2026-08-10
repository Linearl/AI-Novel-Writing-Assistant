import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { prisma } from "../../../db/prisma";
import { llmConnectivityService } from "../../../llm/connectivity";
import { getStructuredFallbackSettings, saveStructuredFallbackSettings } from "../../../llm/structuredFallbackSettings";
import { getProviderModels } from "../../../llm/modelCatalog";
import { listModelRouteConfigs, MODEL_ROUTE_TASK_TYPES, upsertModelRouteConfig } from "../../../llm/modelRouter";
import { llmProviderSchema } from "../../../llm/providerSchema";
import { getProviderEnvApiKey, getProviderEnvModel, isBuiltInProvider, PROVIDERS } from "../../../llm/providers";
import { authMiddleware } from "../../../middleware/auth";
import { AppError } from "../../../middleware/errorHandler";
import { validate } from "../../../middleware/validate";
import { evictSharedLimiters, getSharedLimiterCount } from "../../../llm/requestLimiter";
import { listNovelTokenUsageByNovelIds } from "../../../services/novel/novelTokenUsageSummary";
import { getNovelTokenUsageByStep } from "../../../services/novel/novelTokenUsageByStep";

const router = Router();

const llmTestSchema = z.object({
  provider: llmProviderSchema,
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  baseURL: z.string().trim().url("API URL 格式不正确。").optional(),
  probeMode: z.enum(["plain", "structured", "both"]).optional(),
});

const structuredFallbackSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.union([z.number().int().min(64).max(32768), z.null()]).optional(),
});

router.use(authMiddleware);

router.get("/providers", async (_req, res, next) => {
  try {
    const keys = await prisma.aPIKey.findMany({
      orderBy: [{ createdAt: "asc" }],
    });
    const keyMap = new Map(keys.map((item) => [item.provider, item]));

    const builtInEntries = await Promise.all(
      Object.entries(PROVIDERS).map(async ([provider, config]) => {
        const keyConfig = keyMap.get(provider);
        const currentModel = keyConfig?.model?.trim()
          || getProviderEnvModel(provider)
          || config.defaultModel;
        const models = await getProviderModels(provider, {
          apiKey: keyConfig?.key ?? getProviderEnvApiKey(provider),
          baseURL: keyConfig?.baseURL ?? undefined,
          fallbackModel: currentModel,
          fallbackModels: [...config.models, currentModel],
        });
        return [provider, {
          name: config.name,
          defaultModel: currentModel,
          models,
        }] as const;
      }),
    );

    const customEntries = await Promise.all(
      keys
        .filter((item) => !isBuiltInProvider(item.provider))
        .map(async (item) => {
          const currentModel = item.model?.trim() || "";
          const models = await getProviderModels(item.provider, {
            apiKey: item.key ?? undefined,
            baseURL: item.baseURL ?? undefined,
            fallbackModel: currentModel,
            fallbackModels: [currentModel],
          });
          return [item.provider, {
            name: item.displayName?.trim() || item.provider,
            defaultModel: currentModel,
            models,
          }] as const;
        }),
    );

    const data = Object.fromEntries([...builtInEntries, ...customEntries]);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      message: "获取模型配置成功。",
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/model-routes", async (_req, res, next) => {
  try {
    const data = {
      taskTypes: MODEL_ROUTE_TASK_TYPES,
      routes: await listModelRouteConfigs(),
    };
    res.status(200).json({
      success: true,
      data,
      message: "模型路由配置已加载。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/model-routes/connectivity", async (_req, res, next) => {
  try {
    const data = await llmConnectivityService.testModelRoutes();
    res.status(200).json({
      success: true,
      data,
      message: "模型路由连通性检测完成。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.get("/structured-fallback", async (_req, res, next) => {
  try {
    const data = await getStructuredFallbackSettings();
    res.status(200).json({
      success: true,
      data,
      message: "结构化备用模型配置已加载。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/structured-fallback",
  validate({ body: structuredFallbackSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof structuredFallbackSchema>;
      if ((body.enabled ?? false) && (!body.provider || !body.model)) {
        throw new AppError("启用结构化备用模型时，provider 和 model 不能为空。", 400);
      }
      const data = await saveStructuredFallbackSettings(body);
      res.status(200).json({
        success: true,
        data,
        message: "结构化备用模型配置已更新。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

const modelRouteUpsertSchema = z.object({
  taskType: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.union([z.number().int().min(64).max(16384), z.null()]).optional(),
  requestProtocol: z.enum(["auto", "openai_compatible", "anthropic"]).optional(),
  structuredResponseFormat: z.enum(["auto", "json_schema", "json_object", "prompt_json"]).optional(),
});

router.put(
  "/model-routes",
  validate({ body: modelRouteUpsertSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof modelRouteUpsertSchema>;
      await upsertModelRouteConfig(body.taskType, {
        provider: body.provider,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens ?? null,
        requestProtocol: body.requestProtocol,
        structuredResponseFormat: body.structuredResponseFormat,
      });
      res.status(200).json({
        success: true,
        message: "模型路由已更新。",
      } satisfies ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/test",
  validate({ body: llmTestSchema }),
  async (req, res, next) => {
    try {
      const { provider, apiKey, model, baseURL, probeMode } = req.body as z.infer<typeof llmTestSchema>;
      const result = await llmConnectivityService.testConnection({ provider, apiKey, model, baseURL, probeMode });
      const shouldFail =
        probeMode === "structured"
          ? result.structured?.ok === false
          : probeMode === "plain"
            ? result.plain?.ok === false
            : result.plain?.ok === false && result.structured?.ok === false;
      if (shouldFail) {
        if (/API Key|未配置/.test(result.error ?? "")) {
          next(new AppError(result.error ?? "未配置可用的模型连接。", 400));
          return;
        }
        next(new AppError(result.error ?? "模型连通性测试失败。", 400));
        return;
      }
      const response: ApiResponse<{
        success: boolean;
        model: string;
        latency: number;
        plain: typeof result.plain;
        structured: typeof result.structured;
      }> = {
        success: true,
        data: {
          success: result.ok || result.structured?.ok === true,
          model: result.model,
          latency: result.latency ?? 0,
          plain: result.plain,
          structured: result.structured,
        },
        message: "模型连通性与结构化兼容性测试已完成。",
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// REQ-7062: FR-2 请求限制器热重载
// POST /api/llm/limiter/reload
// ---------------------------------------------------------------------------
router.post("/limiter/reload", (_req, res, next) => {
  try {
    const countBefore = getSharedLimiterCount();
    evictSharedLimiters();
    const response: ApiResponse<{ evictedCount: number }> = {
      success: true,
      data: { evictedCount: countBefore },
      message: `已驱逐 ${countBefore} 个共享限制器，下次请求将根据最新配置重新创建。`,
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// REQ-7062: FR-1 Token 用量查询
// GET /api/llm/token-usage?novelId=xxx&provider=xxx&promptName=xxx&from=xxx&to=xxx
// ---------------------------------------------------------------------------
const tokenUsageQuerySchema = z.object({
  novelId: z.string().trim().optional(),
  provider: z.string().trim().optional(),
  promptName: z.string().trim().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

router.get(
  "/token-usage",
  validate({ query: tokenUsageQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof tokenUsageQuerySchema>;
      const where: Record<string, unknown> = {};
      if (query.novelId) where.novelId = query.novelId;
      if (query.provider) where.provider = query.provider;
      if (query.promptName) where.promptName = query.promptName;
      if (query.from || query.to) {
        where.recordedAt = {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        };
      }

      const [records, totals] = await Promise.all([
        prisma.llmTokenUsage.findMany({
          where,
          orderBy: { recordedAt: "desc" },
          take: query.limit,
        }),
        prisma.llmTokenUsage.aggregate({
          where,
          _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
          _count: true,
        }),
      ]);

      const response: ApiResponse<{
        records: typeof records;
        summary: {
          count: number;
          totalInputTokens: number;
          totalOutputTokens: number;
          totalTokens: number;
        };
      }> = {
        success: true,
        data: {
          records,
          summary: {
            count: totals._count,
            totalInputTokens: totals._sum.inputTokens ?? 0,
            totalOutputTokens: totals._sum.outputTokens ?? 0,
            totalTokens: totals._sum.totalTokens ?? 0,
          },
        },
        message: "Token 用量查询完成。",
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/llm/novels/:novelId/token-stats
 * 返回小说的 Token 统计：总量 + 按步骤分组
 */
router.get(
  "/novels/:novelId/token-stats",
  authMiddleware,
  async (req, res, next) => {
    try {
      const novelId = Array.isArray(req.params.novelId) ? req.params.novelId[0] : req.params.novelId;
      if (!novelId?.trim()) {
        throw new AppError("novelId 不能为空。", 400);
      }

      const [totalMap, byStep] = await Promise.all([
        listNovelTokenUsageByNovelIds([novelId]),
        getNovelTokenUsageByStep(novelId),
      ]);

      const total = totalMap.get(novelId) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        llmCallCount: 0,
        lastRecordedAt: null,
      };

      const response: ApiResponse<{
        total: typeof total;
        byStep: typeof byStep;
      }> = {
        success: true,
        data: { total, byStep },
        message: "Token 统计查询完成。",
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
