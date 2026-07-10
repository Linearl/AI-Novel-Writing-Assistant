import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../../../middleware/validate";
import type { ApiResponse } from "@ai-novel/shared";
import { novelPaceCurveService } from "../../../../services/novel/pace/NovelPaceCurveService";

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });

export function createNovelPaceCurveRoutes(): Router {
  const router = Router();

  type P = Record<string, string>;

  router.get(
    "/novels/:novelId/pace-curve",
    validate({ params: novelIdParamsSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const data = await novelPaceCurveService.getPaceCurve(novelId);
        const response: ApiResponse<typeof data> = { success: true, data };
        res.json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
