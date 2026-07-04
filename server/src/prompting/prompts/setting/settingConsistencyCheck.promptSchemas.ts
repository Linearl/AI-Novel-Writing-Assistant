/**
 * REQ-2038: Setting consistency check — Zod output schema for LLM structured output.
 *
 * Mirrors shared/types/settingConsistency.ts types but exists here as the
 * local schema reference for the PromptAsset outputSchema field.
 */
import { z } from "zod";

export const settingConsistencyCheckOutputSchema = z.object({
  novelId: z.string().min(1),
  checkedAt: z.string(),
  contradictions: z.array(
    z.object({
      id: z.string().min(1),
      severity: z.enum(["critical", "warning", "info"]),
      category: z.enum(["field_conflict", "timeline_conflict", "worldview_inconsistency"]),
      fieldA: z.string().min(1),
      valueA: z.string(),
      fieldB: z.string().min(1),
      valueB: z.string(),
      description: z.string(),
      suggestion: z.string(),
    }),
  ),
  overallScore: z.enum(["pass", "warning", "fail"]),
  summary: z.string(),
});

export type SettingConsistencyCheckOutput = z.infer<typeof settingConsistencyCheckOutputSchema>;
