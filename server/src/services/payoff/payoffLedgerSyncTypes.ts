import type { LLMProvider } from "@ai-novel/shared";

export interface PayoffLedgerSyncOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  chapterOrder?: number | null;
  sourceChapterId?: string | null;
}

export interface PayoffLedgerReadOptions extends PayoffLedgerSyncOptions {
  syncIfMissing?: boolean;
}
