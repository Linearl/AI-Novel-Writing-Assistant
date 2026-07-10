import { z } from "zod";

export const techniqueRecommendOutputSchema = z.object({
  recommendations: z.array(z.object({
    key: z.string().describe("技法的 key"),
    name: z.string().describe("技法名称"),
    description: z.string().describe("技法简短描述"),
    category: z.string().describe("技法分类"),
    reason: z.string().describe("推荐理由，1-2 句中文说明为什么这个技法适合此画像"),
  })).min(5).max(10).describe("推荐 5-10 个技法"),
});

export type TechniqueRecommendOutput = z.infer<typeof techniqueRecommendOutputSchema>;
