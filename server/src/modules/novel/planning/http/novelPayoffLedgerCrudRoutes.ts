import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { validate } from "../../../../middleware/validate";
import { PayoffLedgerCrudService } from "../../../../services/payoff/PayoffLedgerCrudService";

const novelIdParamsSchema = z.object({ novelId: z.string().min(1) });
const itemIdParamsSchema = z.object({ itemId: z.string().min(1) });

const listQuerySchema = z.object({
  status: z.enum(["planted", "active", "resolved", "expired"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  chapterOrder: z.coerce.number().int().positive().optional(),
});

const createBodySchema = z.object({
  title: z.string().trim().min(1, "标题不能为空。").max(200),
  summary: z.string().trim().min(1, "摘要不能为空。").max(2000),
  scopeType: z.enum(["book", "volume", "chapter"]).default("chapter"),
  targetStartChapterOrder: z.number().int().positive().nullable().optional(),
  targetEndChapterOrder: z.number().int().positive().nullable().optional(),
  setupChapterId: z.string().trim().nullable().optional(),
  statusReason: z.string().trim().max(500).nullable().optional(),
});

const updateBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().min(1).max(2000).optional(),
  normalizedStatus: z.enum(["planted", "active", "resolved", "expired"]).optional(),
  statusReason: z.string().trim().max(500).nullable().optional(),
  targetStartChapterOrder: z.number().int().positive().nullable().optional(),
  targetEndChapterOrder: z.number().int().positive().nullable().optional(),
  payoffChapterId: z.string().trim().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "至少需要提供一个更新字段。" },
);

export function createPayoffLedgerCrudRoutes(): Router {
  const router = Router();
  const crudService = new PayoffLedgerCrudService();

  type P = Record<string, string>;

  // GET /novels/:novelId/payoff-ledger — 查询伏笔列表（支持 normalizedStatus 筛选 + 分页）
  router.get(
    "/novels/:novelId/payoff-ledger",
    validate({ params: novelIdParamsSchema, query: listQuerySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const query = listQuerySchema.parse(req.query);
        const data = await crudService.listItems(novelId, {
          normalizedStatus: query.status,
          page: query.page,
          pageSize: query.pageSize,
          chapterOrder: query.chapterOrder,
        });
        const response: ApiResponse<typeof data> = {
          success: true,
          data,
          message: "伏笔列表加载成功。",
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /novels/:novelId/payoff-ledger — 手动创建伏笔条目
  router.post(
    "/novels/:novelId/payoff-ledger",
    validate({ params: novelIdParamsSchema, body: createBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { novelId } = req.params as P;
        const data = await crudService.createItem(novelId, req.body as z.infer<typeof createBodySchema>);
        const response: ApiResponse<typeof data> = {
          success: true,
          data,
          message: "伏笔条目创建成功。",
        };
        res.status(201).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  // PATCH /payoff-ledger/:itemId — 更新伏笔条目
  router.patch(
    "/payoff-ledger/:itemId",
    validate({ params: itemIdParamsSchema, body: updateBodySchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { itemId } = req.params as P;
        const data = await crudService.updateItem(itemId, req.body as z.infer<typeof updateBodySchema>);
        if (!data) {
          res.status(404).json({
            success: false,
            error: "伏笔条目不存在。",
          } satisfies ApiResponse<null>);
          return;
        }
        const response: ApiResponse<typeof data> = {
          success: true,
          data,
          message: "伏笔条目更新成功。",
        };
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
