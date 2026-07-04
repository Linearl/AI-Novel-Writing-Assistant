import { z } from "zod";

export const payoffDetectionItemSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  scopeType: z.enum(["book", "volume", "chapter"]),
  confidence: z.number().min(0).max(1),
  evidenceSummary: z.string().trim().min(1),
});

export const payoffDetectionOutputSchema = z.object({
  detectedPayoffs: z.array(payoffDetectionItemSchema).default([]),
});
