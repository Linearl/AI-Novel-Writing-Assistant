import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { WritingTechniqueService } from "../services/styleEngine/WritingTechniqueService";
import { runStructuredPrompt } from "../prompting/core/promptRunner";
import { techniqueScreeningPrompt } from "../prompting/prompts/writingTechnique/techniqueScreening.prompt";

const router = Router();
const service = new WritingTechniqueService();

// --- 路由 ---

// 列表
router.get("/", async (req, res, next) => {
  try {
    const category = req.query.category as string | undefined;
    const enabled = req.query.enabled === "true" ? true : req.query.enabled === "false" ? false : undefined;
    const techniques = await service.listTechniques({ category, enabled });
    const categories = await service.listCategories();
    res.json({ success: true, data: { techniques, categories } });
  } catch (err) { next(err); }
});

// 详情（含全文）
router.get("/:key", async (req, res, next) => {
  try {
    const technique = await service.getTechniqueByKey(req.params.key as string);
    if (!technique) {
      res.status(404).json({ success: false, error: "技法不存在" });
      return;
    }
    res.json({ success: true, data: technique });
  } catch (err) { next(err); }
});

// 批量开关（必须在 /:key/toggle 之前，否则 Express 会把 "bulk" 当 key）
router.put("/bulk/toggle", validate({
  body: z.object({ enabled: z.boolean() }),
}), async (req, res, next) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    const count = await service.toggleAll(enabled);
    res.json({ success: true, data: { count, enabled } });
  } catch (err) { next(err); }
});

// 全局开关
router.put("/:key/toggle", validate({
  body: z.object({ enabled: z.boolean() }),
}), async (req, res, next) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    const technique = await service.toggleGlobal(req.params.key as string, enabled);
    res.json({ success: true, data: technique });
  } catch (err) { next(err); }
});

// 三级池子解析
router.get("/pool/resolve", async (req, res, next) => {
  try {
    const styleProfileId = req.query.styleProfileId as string | undefined;
    const novelId = req.query.novelId as string | undefined;
    const pool = await service.resolvePool({ styleProfileId, novelId });
    res.json({ success: true, data: pool });
  } catch (err) { next(err); }
});

// 画像绑定 - 列表
router.get("/bindings/profile/:styleProfileId", async (req, res, next) => {
  try {
    const bindings = await service.listProfileBindings(req.params.styleProfileId as string);
    res.json({ success: true, data: bindings });
  } catch (err) { next(err); }
});

// 画像绑定 - 设置
router.put("/bindings/profile/:styleProfileId", validate({
  body: z.object({ techniqueKeys: z.array(z.string()) }),
}), async (req, res, next) => {
  try {
    const { techniqueKeys } = req.body as { techniqueKeys: string[] };
    await service.setProfileBindings(req.params.styleProfileId as string, techniqueKeys);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 小说绑定 - 列表
router.get("/bindings/novel/:novelId", async (req, res, next) => {
  try {
    const bindings = await service.listNovelBindings(req.params.novelId as string);
    res.json({ success: true, data: bindings });
  } catch (err) { next(err); }
});

// 小说绑定 - 设置
router.put("/bindings/novel/:novelId", validate({
  body: z.object({ techniqueKeys: z.array(z.string()) }),
}), async (req, res, next) => {
  try {
    const { techniqueKeys } = req.body as { techniqueKeys: string[] };
    await service.setNovelBindings(req.params.novelId as string, techniqueKeys);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// AI 筛选
router.post("/screen", validate({
  body: z.object({
    candidates: z.array(z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
    })),
    selectedText: z.string().min(1),
    chapterContext: z.string().optional(),
  }),
}), async (req, res, next) => {
  try {
    const { candidates, selectedText, chapterContext } = req.body;

    if (candidates.length === 0) {
      res.json({ success: true, data: { selected: [] } });
      return;
    }

    const result = await runStructuredPrompt({
      asset: techniqueScreeningPrompt,
      promptInput: {
        candidates,
        selectedText,
        chapterContext: chapterContext ?? "",
      },
      options: {
        provider: "deepseek",
        temperature: 0.3,
      },
    });

    res.json({ success: true, data: result.output });
  } catch (err) { next(err); }
});

export default router;
