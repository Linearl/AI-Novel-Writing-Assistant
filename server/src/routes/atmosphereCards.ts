import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { atmosphereCardService } from "../services/styleEngine/AtmosphereCardService";

const router = Router();

// 列表
router.get("/", async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const enabled = req.query.enabled === "true" ? true : req.query.enabled === "false" ? false : undefined;
    const cards = await atmosphereCardService.listCards({ category, enabled });
    const categories = await atmosphereCardService.listCategories();
    res.json({ success: true, data: { cards, categories } });
  } catch (err) { next(err); }
});

// 详情（含全文）
router.get("/:key", async (req, res, next) => {
  try {
    const card = await atmosphereCardService.getCardByKey(req.params.key as string);
    if (!card) {
      res.status(404).json({ success: false, error: "氛围卡不存在" });
      return;
    }
    res.json({ success: true, data: card });
  } catch (err) { next(err); }
});

// 批量开关
router.put("/bulk/toggle", validate({
  body: z.object({ enabled: z.boolean() }),
}), async (req, res, next) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    const count = await atmosphereCardService.toggleAll(enabled);
    res.json({ success: true, data: { count, enabled } });
  } catch (err) { next(err); }
});

// 全局开关
router.put("/:key/toggle", validate({
  body: z.object({ enabled: z.boolean() }),
}), async (req, res, next) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    const card = await atmosphereCardService.toggleGlobal(req.params.key as string, enabled);
    res.json({ success: true, data: card });
  } catch (err) { next(err); }
});

export default router;
