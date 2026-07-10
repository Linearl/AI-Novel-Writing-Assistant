import { z } from "zod";

export const techniqueScreeningOutputSchema = z.object({
  selected: z.array(z.object({
    key: z.string().describe("技法的 key"),
    reason: z.string().describe("一句话说明为什么选这个技法"),
  })).max(5).describe("最多 5 个适用的技法"),
});

export type TechniqueScreeningOutput = z.infer<typeof techniqueScreeningOutputSchema>;
