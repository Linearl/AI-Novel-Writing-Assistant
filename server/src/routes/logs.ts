import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { queryLogs, type LogLevel } from "../services/logging/logQueryService";

const router = Router();

const logQuerySchema = z.object({
  level: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  keyword: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

router.get("/", validate({ query: logQuerySchema }), async (req, res, next) => {
  try {
    const query = req.query as z.infer<typeof logQuerySchema>;
    const result = await queryLogs({
      level: query.level as LogLevel | undefined,
      startTime: query.startTime,
      endTime: query.endTime,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize,
    });

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
