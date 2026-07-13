import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import {
  getStyleEngineRuntimeSettings,
  MAX_STYLE_EXTRACTION_TIMEOUT_MS,
  MIN_STYLE_EXTRACTION_TIMEOUT_MS,
  saveStyleEngineRuntimeSettings,
} from "../../../services/settings/StyleEngineRuntimeSettingsService";

const styleEngineRuntimeSettingsSchema = z.object({
  styleExtractionTimeoutMs: z.coerce
    .number()
    .int()
    .min(MIN_STYLE_EXTRACTION_TIMEOUT_MS)
    .max(MAX_STYLE_EXTRACTION_TIMEOUT_MS),
});

export function registerStyleEngineRoutes(router: Router): void {
  router.get("/style-engine-runtime", async (_req, res, next) => {
    try {
      const data = await getStyleEngineRuntimeSettings();
      res.status(200).json({
        success: true,
        data,
        message: "写法引擎运行设置读取成功。",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.put(
    "/style-engine-runtime",
    validate({ body: styleEngineRuntimeSettingsSchema }),
    async (req, res, next) => {
      try {
        const data = await saveStyleEngineRuntimeSettings(req.body as z.infer<typeof styleEngineRuntimeSettingsSchema>);
        res.status(200).json({
          success: true,
          data,
          message: "写法引擎运行设置保存成功。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
