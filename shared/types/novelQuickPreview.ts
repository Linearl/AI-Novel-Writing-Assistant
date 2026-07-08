import type { LLMProvider } from "./llm";

export interface QuickPreviewCandidate {
  title: string;
  synopsis: string;
  previewText: string;
}

export interface QuickPreviewResult {
  candidates: QuickPreviewCandidate[];
}

export interface QuickPreviewInput {
  inspiration: string;
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}
