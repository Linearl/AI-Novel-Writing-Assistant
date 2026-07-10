import { z } from "zod";

export const techniqueImportOutputSchema = z.object({
  name: z.string().describe("技法的中文名称"),
  description: z.string().describe("一句话描述该技法的核心特征"),
  category: z.enum(["修辞", "叙事", "句法", "对话", "描写", "节奏"]).describe("技法分类"),
  key: z.string().describe("英文 snake_case 格式的唯一标识，例如 inverted_metaphor"),
  body: z.string().describe("技法正文，按标准模板格式组织（## 核心原理 / ## 使用方法 / ## 示例 / ## 关键提示）"),
});

export type TechniqueImportOutput = z.infer<typeof techniqueImportOutputSchema>;
