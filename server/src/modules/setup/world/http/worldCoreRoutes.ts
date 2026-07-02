import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import {
  createWorldSchema,
  knowledgeBindingsSchema,
  knowledgeService,
  requireWorldWizard,
  snapshotCreateSchema,
  snapshotDiffQuerySchema,
  snapshotRestoreParamsSchema,
  updateWorldSchema,
  worldExportQuerySchema,
  worldIdSchema,
  worldImportSchema,
  worldService,
} from "./worldHttpContext";

// Sub-function: Register world CRUD routes
function registerWorldCrudRoutes(router: Router) {
  router.post("/import", requireWorldWizard, validate({ body: worldImportSchema }), async (req: any, res: any, next: any) => {
    try {
      const data = await worldService.importWorld(req.body);
      res.status(201).json({ success: true, data, message: "World imported." });
    } catch (error) { next(error); }
  });

  router.get("/", async (_req: any, res: any, next: any) => {
    try {
      const data = await worldService.listWorlds();
      res.status(200).json({ success: true, data, message: "World list loaded." });
    } catch (error) { next(error); }
  });

  router.post("/", validate({ body: createWorldSchema }), async (req: any, res: any, next: any) => {
    try {
      const data = await worldService.createWorld(req.body);
      res.status(201).json({ success: true, data, message: "World created." });
    } catch (error) { next(error); }
  });

  router.get("/:id", validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await worldService.getWorldById(id);
      if (!data) { res.status(404).json({ success: false, error: "World not found." }); return; }
      res.status(200).json({ success: true, data, message: "World loaded." });
    } catch (error) { next(error); }
  });

  router.put("/:id", validate({ params: worldIdSchema, body: updateWorldSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await worldService.updateWorld(id, req.body);
      res.status(200).json({ success: true, data, message: "World updated." });
    } catch (error) { next(error); }
  });

  router.delete("/:id", validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      await worldService.deleteWorld(id);
      res.status(200).json({ success: true, message: "World deleted." });
    } catch (error) { next(error); }
  });
}

// Sub-function: Register world snapshot routes
function registerWorldSnapshotRoutes(router: Router) {
  router.get("/:id/snapshots", requireWorldWizard, validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await worldService.listSnapshots(id);
      res.status(200).json({ success: true, data, message: "Snapshots loaded." });
    } catch (error) { next(error); }
  });

  router.post("/:id/snapshots", requireWorldWizard, validate({ params: worldIdSchema, body: snapshotCreateSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { label } = req.body;
      const data = await worldService.createSnapshot(id, label);
      res.status(201).json({ success: true, data, message: "Snapshot created." });
    } catch (error) { next(error); }
  });

  router.post("/:id/snapshots/:snapshotId/restore", requireWorldWizard, validate({ params: snapshotRestoreParamsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id, snapshotId } = req.params;
      const data = await worldService.restoreSnapshot(id, snapshotId);
      res.status(200).json({ success: true, data, message: "Snapshot restored." });
    } catch (error) { next(error); }
  });

  router.get("/:id/snapshots/diff", requireWorldWizard, validate({ params: worldIdSchema, query: snapshotDiffQuerySchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { from, to } = snapshotDiffQuerySchema.parse(req.query);
      const data = await worldService.diffSnapshots(id, from, to);
      res.status(200).json({ success: true, data, message: "Snapshot diff generated." });
    } catch (error) { next(error); }
  });

  router.get("/:id/export", requireWorldWizard, validate({ params: worldIdSchema, query: worldExportQuerySchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { format } = worldExportQuerySchema.parse(req.query);
      const data = await worldService.exportWorld(id, format);
      res.status(200).json({ success: true, data, message: "Export payload prepared." });
    } catch (error) { next(error); }
  });
}

// Sub-function: Register world knowledge routes
function registerWorldKnowledgeRoutes(router: Router) {
  router.get("/:id/knowledge-documents", validate({ params: worldIdSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const data = await knowledgeService.listBindings("world", id);
      res.status(200).json({ success: true, data, message: "World knowledge documents loaded." });
    } catch (error) { next(error); }
  });

  router.put("/:id/knowledge-documents", validate({ params: worldIdSchema, body: knowledgeBindingsSchema }), async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const data = await knowledgeService.replaceBindings("world", id, body.documentIds);
      res.status(200).json({ success: true, data, message: "World knowledge documents updated." });
    } catch (error) { next(error); }
  });
}

export function registerCoreWorldRoutes(router: Router): void {
  registerWorldCrudRoutes(router);
  registerWorldSnapshotRoutes(router);
  registerWorldKnowledgeRoutes(router);
}
