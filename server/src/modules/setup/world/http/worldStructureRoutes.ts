import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import type { WorldLayerKey, WorldStructureSectionKey } from "@ai-novel/shared";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import {
  consistencyCheckSchema,
  consistencyFixSchema,
  consistencyIssuePatchSchema,
  deepeningAnswerSchema,
  deepeningQuestionSchema,
  issueIdSchema,
  layerGenerateSchema,
  layerParamsSchema,
  layerUpdateSchema,
  requireWorldWizard,
  structureBackfillSchema,
  structureGenerateSchema,
  structureModifySchema,
  structureUpdateSchema,
  suggestAxiomsSchema,
  updateAxiomsSchema,
  worldIdSchema,
  worldService,
} from "./worldHttpContext";

// Sub-function: Register structure routes
function registerStructureRoutes(router: Router) {
  router.get("/:id/structure", requireWorldWizard, validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.getStructure(id);
      res.status(200).json({ success: true, data, message: "Structured world loaded." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.put("/:id/structure", requireWorldWizard, validate({ params: worldIdSchema, body: structureUpdateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.updateStructure(id, req.body as z.infer<typeof structureUpdateSchema>);
      res.status(200).json({ success: true, data, message: "Structured world saved." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/structure/backfill", requireWorldWizard, validate({ params: worldIdSchema, body: structureBackfillSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.backfillStructure(id, req.body as z.infer<typeof structureBackfillSchema>);
      res.status(200).json({ success: true, data, message: "Structured world backfilled." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/structure/generate", requireWorldWizard, validate({ params: worldIdSchema, body: structureGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.generateStructure(id, req.body as z.infer<typeof structureGenerateSchema> & { section: WorldStructureSectionKey });
      res.status(200).json({ success: true, data, message: "Structure section generated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/axioms/suggest", requireWorldWizard, validate({ params: worldIdSchema, body: suggestAxiomsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.suggestAxioms(id, req.body as z.infer<typeof suggestAxiomsSchema>);
      res.status(200).json({ success: true, data, message: "Axioms suggested." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.put("/:id/axioms", requireWorldWizard, validate({ params: worldIdSchema, body: updateAxiomsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const { axioms } = req.body as z.infer<typeof updateAxiomsSchema>;
      const data = await worldService.updateAxioms(id, axioms);
      res.status(200).json({ success: true, data, message: "Axioms updated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}

// Sub-function: Register layer routes
function registerLayerRoutes(router: Router) {
  router.post("/:id/layers/generate-all", requireWorldWizard, validate({ params: worldIdSchema, body: layerGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.generateAllLayers(id, req.body as z.infer<typeof layerGenerateSchema>);
      res.status(200).json({ success: true, data, message: "All layers generated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/layers/:layerKey/generate", requireWorldWizard, validate({ params: layerParamsSchema, body: layerGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, layerKey } = req.params as z.infer<typeof layerParamsSchema>;
      const data = await worldService.generateLayer(id, layerKey as WorldLayerKey, req.body as z.infer<typeof layerGenerateSchema>);
      res.status(200).json({ success: true, data, message: "Layer generated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.put("/:id/layers/:layerKey", requireWorldWizard, validate({ params: layerParamsSchema, body: layerUpdateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, layerKey } = req.params as z.infer<typeof layerParamsSchema>;
      const data = await worldService.updateLayer(id, layerKey as WorldLayerKey, req.body as z.infer<typeof layerUpdateSchema>);
      res.status(200).json({ success: true, data, message: "Layer updated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/layers/:layerKey/confirm", requireWorldWizard, validate({ params: layerParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, layerKey } = req.params as z.infer<typeof layerParamsSchema>;
      const data = await worldService.confirmLayer(id, layerKey as WorldLayerKey);
      res.status(200).json({ success: true, data, message: "Layer confirmed." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}

// Sub-function: Register deepening routes
function registerDeepeningRoutes(router: Router) {
  router.post("/:id/deepening/questions", requireWorldWizard, validate({ params: worldIdSchema, body: deepeningQuestionSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.createDeepeningQuestions(id, req.body as z.infer<typeof deepeningQuestionSchema>);
      res.status(200).json({ success: true, data, message: "Deepening questions generated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/deepening/answers", requireWorldWizard, validate({ params: worldIdSchema, body: deepeningAnswerSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const { answers } = req.body as z.infer<typeof deepeningAnswerSchema>;
      const data = await worldService.answerDeepeningQuestions(id, answers);
      res.status(200).json({ success: true, data, message: "Answers integrated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}

// Sub-function: Register consistency routes
function registerConsistencyRoutes(router: Router) {
  router.post("/:id/consistency/check", requireWorldWizard, validate({ params: worldIdSchema, body: consistencyCheckSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.checkConsistency(id, req.body as z.infer<typeof consistencyCheckSchema>);
      res.status(200).json({ success: true, data, message: "Consistency checked." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.patch("/:id/consistency/issues/:issueId", requireWorldWizard, validate({ params: issueIdSchema, body: consistencyIssuePatchSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, issueId } = req.params as z.infer<typeof issueIdSchema>;
      const { status } = req.body as z.infer<typeof consistencyIssuePatchSchema>;
      const data = await worldService.updateConsistencyIssueStatus(id, issueId, status);
      res.status(200).json({ success: true, data, message: "Issue status updated." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });

  router.post("/:id/consistency/fix", requireWorldWizard, validate({ params: worldIdSchema, body: consistencyFixSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const { issueId, provider, model, customSuggestion } = req.body as z.infer<typeof consistencyFixSchema>;
      const data = await worldService.fixConsistencyIssue(id, issueId, { provider, model, customSuggestion });
      res.status(200).json({ success: true, data, message: "Issue fixed." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}

// Sub-function: Register AI assistant routes
function registerAIAssistantRoutes(router: Router) {
  router.post("/:id/structure/modify", requireWorldWizard, validate({ params: worldIdSchema, body: structureModifySchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.modifyStructure(id, req.body as z.infer<typeof structureModifySchema>);
      res.status(200).json({ success: true, data, message: "Structure modified by AI assistant." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}

export function registerStructureWorldRoutes(router: Router): void {
  registerStructureRoutes(router);
  registerLayerRoutes(router);
  registerDeepeningRoutes(router);
  registerConsistencyRoutes(router);
  registerAIAssistantRoutes(router);

  router.get("/:id/overview", requireWorldWizard, validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params as z.infer<typeof worldIdSchema>;
      const data = await worldService.getOverview(id);
      res.status(200).json({ success: true, data, message: "Overview loaded." } satisfies ApiResponse<typeof data>);
    } catch (error) { next(error); }
  });
}
