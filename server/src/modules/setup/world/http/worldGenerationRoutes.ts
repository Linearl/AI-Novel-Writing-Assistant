import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { initSSE, streamToSSE, writeSSEFrame } from "../../../../llm/streaming";
import { validate } from "../../../../middleware/validate";
import type { WorldSkeletonGenerateInput } from "../../../../services/world/worldSkeletonGeneration";
import {
  inspirationSchema,
  libraryCreateSchema,
  libraryListQuerySchema,
  libraryUseParamsSchema,
  libraryUseSchema,
  requireWorldWizard,
  worldGenerateSchema,
  worldSkeletonGenerateSchema,
  worldRefineSchema,
  worldIdSchema,
  worldService,
} from "./worldHttpContext";

// Sub-function: Register template and library routes
function registerTemplateAndLibraryRoutes(router: Router) {
  router.get("/templates", requireWorldWizard, async (_req: any, res: any, next: any) => {
    try {
      const data = await worldService.getTemplates();
      res.status(200).json({ success: true, data, message: "Templates loaded." });
    } catch (error) { next(error); }
  });

  router.get("/library", requireWorldWizard, validate({ query: libraryListQuerySchema }), async (req: any, res: any, next: any) => {
    try {
      const query = libraryListQuerySchema.parse(req.query);
      const data = await worldService.listLibrary(query);
      res.status(200).json({ success: true, data, message: "Library loaded." });
    } catch (error) { next(error); }
  });

  router.post("/library", requireWorldWizard, validate({ body: libraryCreateSchema }), async (req: any, res: any, next: any) => {
    try {
      const data = await worldService.createLibraryItem(req.body);
      res.status(201).json({ success: true, data, message: "Library item created." });
    } catch (error) { next(error); }
  });

  router.post("/library/:libraryId/use", requireWorldWizard, validate({ params: libraryUseParamsSchema, body: libraryUseSchema }), async (req: any, res: any, next: any) => {
    try {
      const { libraryId } = req.params;
      const data = await worldService.useLibraryItem(libraryId, req.body);
      res.status(200).json({ success: true, data, message: "Library item used." });
    } catch (error) { next(error); }
  });
}

// Sub-function: Register generation routes
function registerGenerationRoutes(router: Router) {
  router.post("/generate", validate({ body: worldGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { stream, onDone } = await worldService.createWorldGenerateStream(req.body);
      await streamToSSE(res, stream, onDone);
    } catch (error) { next(error); }
  });

  router.post("/skeleton/generate", requireWorldWizard, validate({ body: worldSkeletonGenerateSchema }), async (req: any, res: any, next: any) => {
    try {
      const data = await worldService.generateSkeleton(req.body);
      res.status(200).json({ success: true, data, message: "World skeleton generated." });
    } catch (error) { next(error); }
  });

  router.post("/:id/refine", validate({ params: worldIdSchema, body: worldRefineSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { stream, onDone } = await worldService.createRefineStream(id, req.body);
      await streamToSSE(res, stream, onDone);
    } catch (error) { next(error); }
  });
}

// Sub-function: Register SSE streaming routes
function registerStreamingRoutes(router: Router) {
  router.post("/skeleton/generate-stream", requireWorldWizard, validate({ body: worldSkeletonGenerateSchema }), async (req: any, res: any) => {
    const runId = `world-skeleton-${Date.now()}`;
    const disposeHeartbeat = initSSE(res);
    try {
      writeSSEFrame(res, { type: "run_status", runId, status: "queued", message: "已开始生成世界骨架" });
      const data = await worldService.generateSkeletonWithProgress(req.body, (event) => {
        writeSSEFrame(res, { type: "run_status", runId, status: "running", message: event.stage ? `${event.stage.label} ${event.stage.order}/${event.stage.totalStages}` : event.message ?? "", percent: event.stage ? Math.round((event.stage.order / event.stage.totalStages) * 100) : undefined });
      });
      writeSSEFrame(res, { type: "run_status", runId, status: "succeeded", message: "世界骨架生成完成" });
      writeSSEFrame(res, { type: "done", fullContent: JSON.stringify(data) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "世界骨架生成失败。";
      writeSSEFrame(res, { type: "run_status", runId, status: "failed", message });
      writeSSEFrame(res, { type: "error", error: message });
    } finally {
      disposeHeartbeat();
      if (!res.writableEnded) res.end();
    }
  });

  router.post("/inspiration/analyze/stream", requireWorldWizard, validate({ body: inspirationSchema }), async (req: any, res: any) => {
    const runId = `world-inspiration-${Date.now()}`;
    const disposeHeartbeat = initSSE(res);
    const body = req.body;
    const isReferenceMode = body.mode === "reference";
    try {
      writeSSEFrame(res, { type: "run_status", runId, status: "queued", message: isReferenceMode ? "已开始分析参考作品" : "已开始分析世界灵感" });
      const data = await worldService.analyzeInspiration(body, (message) => {
        writeSSEFrame(res, { type: "run_status", runId, status: "running", message });
      });
      writeSSEFrame(res, { type: "run_status", runId, status: "succeeded", message: isReferenceMode ? "原作锚点与架空方向已生成" : "概念卡与属性选项已生成" });
      writeSSEFrame(res, { type: "done", fullContent: JSON.stringify(data) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "世界灵感分析失败。";
      writeSSEFrame(res, { type: "run_status", runId, status: "failed", message });
      writeSSEFrame(res, { type: "error", error: message });
    } finally {
      disposeHeartbeat();
      if (!res.writableEnded) res.end();
    }
  });
}

export function registerGenerationWorldRoutes(router: Router): void {
  registerTemplateAndLibraryRoutes(router);
  registerGenerationRoutes(router);
  registerStreamingRoutes(router);
}
