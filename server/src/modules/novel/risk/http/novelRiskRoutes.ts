import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../../../middleware/validate";
import { novelRiskService } from "../../../../services/novel/risk/NovelRiskService";
import type { ApiResponse } from "@ai-novel/shared/types/api";

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });
const riskIdParamsSchema = z.object({ novelId: z.string().min(1), riskId: z.string().min(1) });

const listQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  severity: z.string().optional(),
}).optional();

const updateStatusBodySchema = z.object({
  status: z.enum(["open", "ignored", "accepted", "resolved", "reopened"]),
  comment: z.string().max(1000).optional(),
});

const createRiskBodySchema = z.object({
  type: z.string().default("quality"),
  severity: z.string().default("medium"),
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional(),
  chapterId: z.string().optional(),
  chapterRange: z.string().optional(),
  volumeId: z.string().optional(),
  impactAssessment: z.string().optional(),
  triggerSource: z.string().optional(),
  sourceMetadata: z.unknown().optional(),
});

export function createNovelRiskRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  // List risks
  router.get(
    "/novels/:novelId/risks",
    validate({ params: novelIdParamsSchema, query: listQuerySchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const query = req.query as Record<string, string | string[] | undefined>;
        const risks = await novelRiskService.listRisks(novelId, {
          status: (typeof query.status === "string" ? query.status : undefined) as any,
          type: (typeof query.type === "string" ? query.type : undefined) as any,
          severity: (typeof query.severity === "string" ? query.severity : undefined) as any,
        });
        const response: ApiResponse<typeof risks> = { success: true, data: risks };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // Get single risk
  router.get(
    "/novels/:novelId/risks/:riskId",
    validate({ params: riskIdParamsSchema }),
    async (req, res, next) => {
      try {
        const { novelId, riskId } = req.params as P;
        const risk = await novelRiskService.getRisk(novelId, riskId);
        if (!risk) {
          res.status(404).json({ success: false, error: "风险不存在" });
          return;
        }
        const response: ApiResponse<typeof risk> = { success: true, data: risk };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // Create risk
  router.post(
    "/novels/:novelId/risks",
    validate({ params: novelIdParamsSchema, body: createRiskBodySchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const risk = await novelRiskService.createRisk({ novelId, ...req.body });
        const response: ApiResponse<typeof risk> = { success: true, data: risk };
        res.status(201).json(response);
      } catch (error) { next(error); }
    },
  );

  // Update risk status
  router.patch(
    "/novels/:novelId/risks/:riskId/status",
    validate({ params: riskIdParamsSchema, body: updateStatusBodySchema }),
    async (req, res, next) => {
      try {
        const { novelId, riskId } = req.params as P;
        const { status, comment } = req.body;
        const risk = await novelRiskService.updateRiskStatus(novelId, riskId, status, "user", comment);
        if (!risk) {
          res.status(404).json({ success: false, error: "风险不存在" });
          return;
        }
        const response: ApiResponse<typeof risk> = { success: true, data: risk };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // Get assessment
  router.get(
    "/novels/:novelId/risks/assessment",
    validate({ params: novelIdParamsSchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const assessment = await novelRiskService.getAssessment(novelId);
        const response: ApiResponse<typeof assessment> = { success: true, data: assessment };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  // Export risks
  router.post(
    "/novels/:novelId/risks/export",
    validate({ params: novelIdParamsSchema }),
    async (req, res, next) => {
      try {
        const { novelId } = req.params as P;
        const novel = await (await import("../../../../db/prisma")).prisma.novel.findUnique({
          where: { id: novelId },
          select: { title: true },
        });
        const exportData = await novelRiskService.exportRisks(novelId, novel?.title ?? "未知小说");
        const response: ApiResponse<typeof exportData> = { success: true, data: exportData };
        res.json(response);
      } catch (error) { next(error); }
    },
  );

  return router;
}
