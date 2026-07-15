export const LLM_PROVIDERS = [
  "deepseek",
  "siliconflow",
  "openai",
  "anthropic",
  "grok",
  "kimi",
  "minimax",
  "glm",
  "qwen",
  "gemini",
  "ollama",
] as const;

export type BuiltinLLMProvider = typeof LLM_PROVIDERS[number];
export type LLMProvider = BuiltinLLMProvider | (string & {});

export function isBuiltinLLMProvider(provider: string): provider is BuiltinLLMProvider {
  return (LLM_PROVIDERS as readonly string[]).includes(provider);
}

export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderConfig {
  name: string;
  provider: LLMProvider;
  baseURL: string;
  defaultModel: string;
  models: string[];
  envKey: string;
}

// ---------------------------------------------------------------------------
// REQ-7062: 验收状态规范化
// ---------------------------------------------------------------------------

export const ACCEPTANCE_STATUSES = {
  PENDING: "pending",
  AUTO_APPROVED: "auto_approved",
  USER_APPROVED: "user_approved",
  REVISION_REQUIRED: "revision_required",
  REJECTED: "rejected",
} as const;

export type AcceptanceStatus =
  (typeof ACCEPTANCE_STATUSES)[keyof typeof ACCEPTANCE_STATUSES];
