import { z } from "zod";

/**
 * Schema for the LLM material parse output.
 * Maps raw user material to structured NovelBasicFormState fields.
 */
export const materialParseOutputSchema = z.object({
  title: z.string().trim().min(1).max(100).optional()
    .describe("小说标题，从素材中识别"),
  description: z.string().trim().max(500).optional()
    .describe("一句话概述，用 2-4 句话概括主角、核心冲突和故事看点"),
  targetAudience: z.string().trim().max(200).optional()
    .describe("目标读者画像"),
  bookSellingPoint: z.string().trim().max(500).optional()
    .describe("核心卖点：这本书最抓人的点"),
  competingFeel: z.string().trim().max(200).optional()
    .describe("竞品阅读感：读者会联想到的阅读体验"),
  first30ChapterPromise: z.string().trim().max(500).optional()
    .describe("前 30 章承诺：读者一定能看到什么、爽到什么"),
  styleTone: z.string().trim().max(100).optional()
    .describe("风格关键词，如冷峻、克制、黑色幽默"),
  commercialTagsText: z.string().trim().max(200).optional()
    .describe("商业标签，逗号分隔，如逆袭、强冲突、悬念拉满"),
  worldSetting: z.string().trim().max(2000).optional()
    .describe("世界观设定摘要：时代背景、力量体系、核心规则等"),
  characters: z.string().trim().max(2000).optional()
    .describe("角色信息摘要：主要角色名、身份、关系、动机"),
  outline: z.string().trim().max(2000).optional()
    .describe("大纲信息摘要：主线脉络、关键剧情转折"),
  genreHint: z.string().trim().max(100).optional()
    .describe("从素材中识别的题材倾向关键词，如修仙、都市、悬疑"),
});

export type MaterialParseOutput = z.infer<typeof materialParseOutputSchema>;
