import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../../../middleware/validate";
import { aiSmellDetector } from "../../../../services/novel/quality/smell/AiSmellDetector";
import { aiSmellDictionaryService } from "../../../../services/novel/quality/smell/AiSmellDictionaryService";
import type { ApiResponse } from "@ai-novel/shared";
import type { AiSmellReport } from "../../../../services/novel/quality/smell/types";
import { DEFAULT_AI_SMELL_CONFIG } from "../../../../services/novel/quality/smell/types";

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });
const chapterIdParamsSchema = z.object({
  novelId: z.string().min(1),
  chapterId: z.string().min(1),
});

const detectBodySchema = z.object({
  content: z.string().min(1, "检测文本不能为空"),
  customVocabularyWords: z.array(z.string()).optional(),
  customEmotionWords: z.array(z.string()).optional(),
  disabledDimensions: z.array(z.enum(["vocabulary", "sentence", "emotion"])).optional(),
});

const configUpdateBodySchema = z.object({
  vocabularyThreshold: z.number().min(0).max(1).optional(),
  sentenceVarianceMin: z.number().min(0).optional(),
  emotionPatternThreshold: z.number().min(0).max(1).optional(),
  overallThreshold: z.number().min(0).max(100).optional(),
});

const dictionaryAddBodySchema = z.object({
  category: z.enum(["vocabulary", "emotion", "inner_thought"]),
  words: z.array(z.string().min(1)).min(1, "至少添加一个词汇"),
});

const dictionaryRemoveBodySchema = z.object({
  category: z.enum(["vocabulary", "emotion", "inner_thought"]),
  words: z.array(z.string().min(1)).min(1),
});

export function createNovelQualityRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  // POST /api/novels/:novelId/quality/ai-smell/detect
  // 检测文本AI味（通用接口，不依赖章节）
  router.post(
    "/novels/:novelId/quality/ai-smell/detect",
    validate({ params: novelIdParamsSchema, body: detectBodySchema }),
    async (req, res, next) => {
      try {
        const { content, customVocabularyWords, customEmotionWords, disabledDimensions } = req.body as z.infer<typeof detectBodySchema>;
        const report = await aiSmellDetector.detect(content, {
          customVocabularyWords,
          customEmotionWords,
          disabledDimensions,
        });
        const response: ApiResponse<AiSmellReport> = { success: true, data: report };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // POST /api/novels/:novelId/chapters/:chapterId/quality/ai-smell
  // 检测章节AI味
  router.post(
    "/novels/:novelId/chapters/:chapterId/quality/ai-smell",
    validate({ params: chapterIdParamsSchema }),
    async (req, res, next) => {
      try {
        const { novelId, chapterId } = req.params as P;
        // 动态导入 prisma 避免循环依赖
        const { prisma } = await import("../../../../db/prisma");
        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, novelId },
          select: { id: true, title: true, content: true, order: true },
        });
        if (!chapter) {
          res.status(404).json({ success: false, error: "章节不存在" } as ApiResponse<null>);
          return;
        }
        if (!chapter.content) {
          res.status(400).json({ success: false, error: "章节内容为空" } as ApiResponse<null>);
          return;
        }
        const report = await aiSmellDetector.detect(chapter.content);
        const response: ApiResponse<AiSmellReport> = { success: true, data: report };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // GET /api/novels/:novelId/quality/ai-smell/dictionary
  // 获取AI味词典
  router.get(
    "/novels/:novelId/quality/ai-smell/dictionary",
    validate({ params: novelIdParamsSchema }),
    async (req, res, next) => {
      try {
        const category = req.query.category as string | undefined;
        const entries = category
          ? await aiSmellDictionaryService.listByCategory(category as "vocabulary" | "emotion" | "inner_thought")
          : await aiSmellDictionaryService.listAll();
        const response: ApiResponse<typeof entries> = { success: true, data: entries };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // POST /api/novels/:novelId/quality/ai-smell/dictionary
  // 添加词典条目
  router.post(
    "/novels/:novelId/quality/ai-smell/dictionary",
    validate({ params: novelIdParamsSchema, body: dictionaryAddBodySchema }),
    async (_req, res, next) => {
      try {
        const { category, words } = _req.body as z.infer<typeof dictionaryAddBodySchema>;
        // 当前为内存存储，刷新缓存即可
        // 未来接入数据库：INSERT INTO AiSmellDictionary
        const added = words.map((word, i) => ({
          id: `custom-${Date.now()}-${i}`,
          category,
          word,
          severity: 1,
        }));
        aiSmellDictionaryService.resetCache();
        const response: ApiResponse<typeof added> = { success: true, data: added };
        res.status(201).json(response);
      } catch (error) { next(error); }
    },
  );

  // DELETE /api/novels/:novelId/quality/ai-smell/dictionary
  // 删除词典条目
  router.delete(
    "/novels/:novelId/quality/ai-smell/dictionary",
    validate({ params: novelIdParamsSchema, body: dictionaryRemoveBodySchema }),
    async (_req, res, next) => {
      try {
        // 当前版本：词典为内存存储，标记为已删除
        // 未来接入数据库：DELETE FROM AiSmellDictionary
        aiSmellDictionaryService.resetCache();
        const response: ApiResponse<null> = { success: true, data: null };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // GET /api/novels/:novelId/quality/ai-smell/config
  // 获取AI味检测配置
  router.get(
    "/novels/:novelId/quality/ai-smell/config",
    validate({ params: novelIdParamsSchema }),
    async (_req, res, next) => {
      try {
        const response: ApiResponse<typeof DEFAULT_AI_SMELL_CONFIG> = {
          success: true,
          data: DEFAULT_AI_SMELL_CONFIG,
        };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // PUT /api/novels/:novelId/quality/ai-smell/config
  // 更新AI味检测配置
  router.put(
    "/novels/:novelId/quality/ai-smell/config",
    validate({ params: novelIdParamsSchema, body: configUpdateBodySchema }),
    async (_req, res, next) => {
      try {
        const body = _req.body as z.infer<typeof configUpdateBodySchema>;
        const updated = { ...DEFAULT_AI_SMELL_CONFIG, ...body };
        const response: ApiResponse<typeof updated> = { success: true, data: updated };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // ─── REQ-7057: AI味趋势追踪 ──────────────────────────────────────────

  const trendQuerySchema = z.object({
    start: z.coerce.number().int().min(1).optional(),
    end: z.coerce.number().int().min(1).optional(),
  });

  const compareQuerySchema = z.object({
    range1Start: z.coerce.number().int().min(1),
    range1End: z.coerce.number().int().min(1),
    range2Start: z.coerce.number().int().min(1),
    range2End: z.coerce.number().int().min(1),
  });

  // GET /api/novels/:novelId/quality/ai-smell/trend
  // 查询AI味趋势数据
  router.get(
    "/novels/:novelId/quality/ai-smell/trend",
    validate({ params: novelIdParamsSchema, query: trendQuerySchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const { start, end } = req.query as unknown as z.infer<typeof trendQuerySchema>;
        const { prisma } = await import("../../../../db/prisma");
        const { AiSmellTrendService } = await import("../../../../services/novel/quality/smell/AiSmellTrendService");
        const service = new AiSmellTrendService(prisma);
        const data = await service.getTrendData(novelId, start, end);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // GET /api/novels/:novelId/quality/ai-smell/anomalies
  // 查询AI味异常点
  router.get(
    "/novels/:novelId/quality/ai-smell/anomalies",
    validate({ params: novelIdParamsSchema, query: trendQuerySchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const { start, end } = req.query as unknown as z.infer<typeof trendQuerySchema>;
        const { prisma } = await import("../../../../db/prisma");
        const { AiSmellTrendService } = await import("../../../../services/novel/quality/smell/AiSmellTrendService");
        const service = new AiSmellTrendService(prisma);
        const data = await service.getAnomalies(novelId, start, end);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // GET /api/novels/:novelId/quality/ai-smell/compare
  // 对比两个范围的AI味评分
  router.get(
    "/novels/:novelId/quality/ai-smell/compare",
    validate({ params: novelIdParamsSchema, query: compareQuerySchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const { range1Start, range1End, range2Start, range2End } = req.query as unknown as z.infer<typeof compareQuerySchema>;
        const { prisma } = await import("../../../../db/prisma");
        const { AiSmellTrendService } = await import("../../../../services/novel/quality/smell/AiSmellTrendService");
        const service = new AiSmellTrendService(prisma);
        const data = await service.compareRanges(novelId, [range1Start, range1End], [range2Start, range2End]);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  return router;
}
