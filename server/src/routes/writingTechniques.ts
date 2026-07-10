import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { WritingTechniqueService } from "../services/styleEngine/WritingTechniqueService";
import { runStructuredPrompt } from "../prompting/core/promptRunner";
import { techniqueScreeningPrompt } from "../prompting/prompts/writingTechnique/techniqueScreening.prompt";
import { techniqueImportPrompt } from "../prompting/prompts/writingTechnique/techniqueImport.prompt";
import { techniqueRecommendPrompt } from "../prompting/prompts/writingTechnique/techniqueRecommend.prompt";
import { prisma } from "../db/prisma";

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

// 导入技法
router.post("/import", validate({
  body: z.object({
    content: z.string().min(1, "内容不能为空"),
    fileName: z.string().optional(),
  }),
}), async (req, res, next) => {
  try {
    const { content, fileName } = req.body as { content: string; fileName?: string };

    // 获取已有技法名称，用于 prompt 中避免重复
    const existing = await prisma.writingTechnique.findMany({
      select: { name: true, key: true },
    });
    const existingNames = existing.map((t) => t.name);

    // AI 解析
    const result = await runStructuredPrompt({
      asset: techniqueImportPrompt,
      promptInput: {
        content,
        existingNames,
      },
      options: {
        provider: "deepseek",
        temperature: 0.3,
      },
    });

    const parsed = result.output as {
      name: string;
      description: string;
      category: string;
      key: string;
      body: string;
    };

    // 检查 key 是否重复
    const duplicateKey = existing.find((t) => t.key === parsed.key);
    if (duplicateKey) {
      res.status(409).json({
        success: false,
        error: `已存在相同标识的技法「${duplicateKey.name}」（key: ${parsed.key}），请修改名称后重试`,
      });
      return;
    }

    // 检查名称是否重复（精确匹配）
    const duplicateName = existing.find((t) => t.name === parsed.name);
    if (duplicateName) {
      res.status(409).json({
        success: false,
        error: `已存在同名技法「${parsed.name}」（key: ${duplicateName.key}），请确认是否为同一技法`,
      });
      return;
    }

    // 写入 md 文件
    const dataDir = resolve(__dirname, "../../data/writingTechniques");
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const mdContent = [
      "---",
      `name: ${parsed.name}`,
      `description: ${parsed.description}`,
      `category: ${parsed.category}`,
      "---",
      "",
      parsed.body,
    ].join("\n");

    const safeFileName = fileName
      ? fileName.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/\.md$/, "")
      : parsed.key;
    const filePath = join(dataDir, `${safeFileName}.md`);
    const relativePath = `server/src/data/writingTechniques/${safeFileName}.md`;

    writeFileSync(filePath, mdContent, "utf-8");

    // 写入 DB
    const technique = await prisma.writingTechnique.create({
      data: {
        key: parsed.key,
        name: parsed.name,
        description: parsed.description,
        category: parsed.category,
        filePath: relativePath,
        enabled: false,
      },
    });

    res.json({
      success: true,
      data: {
        ...technique,
        body: parsed.body,
      },
    });
  } catch (err) {
    next(err);
  }
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

// AI 推荐技法 for 画像
router.post("/recommend-for-profile", validate({
  body: z.object({
    styleProfileId: z.string().min(1),
    profileName: z.string().min(1),
    profileDescription: z.string().optional(),
  }),
}), async (req, res, next) => {
  try {
    const { profileName, profileDescription } = req.body as {
      styleProfileId: string;
      profileName: string;
      profileDescription?: string;
    };

    // 获取所有技法列表
    const techniques = await service.listTechniques({ enabled: true });
    const techniqueList = techniques.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      category: t.category ?? "",
    }));

    if (techniqueList.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const result = await runStructuredPrompt({
      asset: techniqueRecommendPrompt,
      promptInput: {
        profileName,
        profileDescription,
        techniques: techniqueList,
      },
      options: {
        provider: "deepseek",
        temperature: 0.5,
      },
    });

    res.json({ success: true, data: result.output.recommendations });
  } catch (err) { next(err); }
});

export default router;
