/**
 * Environment variable validation for server startup.
 *
 * Validates critical env vars at boot time and produces a colorized report.
 * Missing required variables block startup with actionable error messages.
 *
 * Design principles:
 * - Be realistic: only flag as "required" what genuinely prevents startup
 * - Respect existing defaults: DATABASE_URL, PORT, etc. have sensible fallbacks
 * - Warn don't block: API keys can be configured via secretStore at runtime
 */

// ---- Types ----

export interface EnvVariableDefinition {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description: string;
  example: string;
}

export interface EnvValidationError {
  name: string;
  message: string;
  suggestion: string;
}

export interface EnvValidationWarning {
  name: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: EnvValidationError[];
  warnings: EnvValidationWarning[];
}

// ---- Color helpers ----

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";

function green(text: string): string {
  return `${GREEN}${text}${RESET}`;
}

function red(text: string): string {
  return `${RED}${text}${RESET}`;
}

function yellow(text: string): string {
  return `${YELLOW}${text}${RESET}`;
}

function cyan(text: string): string {
  return `${CYAN}${text}${RESET}`;
}

function gray(text: string): string {
  return `${GRAY}${text}${RESET}`;
}

function bold(text: string): string {
  return `${BOLD}${text}${RESET}`;
}

// ---- Validators ----

function portValidator(value: string): boolean {
  const port = parseInt(value, 10);
  return !isNaN(port) && port >= 1 && port <= 65535;
}

function booleanValidator(value: string): boolean {
  const normalized = value.toLowerCase();
  return ["true", "false", "1", "0", "on", "off", "yes", "no"].includes(normalized);
}

function logLevelValidator(value: string): boolean {
  return ["debug", "info", "warn", "error", "silent"].includes(value.toLowerCase());
}

function nonEmptyValidator(value: string): boolean {
  return value.trim().length > 0;
}

function corsOriginValidator(value: string): boolean {
  // Comma-separated list of URLs or "*"
  if (value === "*") return true;
  const origins = value.split(",").map((s) => s.trim()).filter(Boolean);
  if (origins.length === 0) return false;
  return origins.every((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

function apiKeyFormatValidator(value: string): boolean {
  // Loose check: non-empty string of reasonable length, not containing whitespace
  const trimmed = value.trim();
  return trimmed.length >= 8 && !/\s/.test(trimmed);
}

// ---- Variable Definitions ----

/**
 * Environment variable definitions.
 *
 * Categories:
 * - required: server cannot start without these in production
 * - optional-with-default: automatically set if missing
 * - optional-loose: format checked only if explicitly set
 * - api-keys: warned about but not blocked (can be set via secretStore)
 */
const ENV_VARIABLES: EnvVariableDefinition[] = [
  // === Critical required vars ===
  {
    name: "NODE_ENV",
    required: false,
    defaultValue: "development",
    validator: (v) => ["development", "production", "test"].includes(v),
    description: "Node.js 运行环境",
    example: "production",
  },

  // === Database ===
  {
    name: "DATABASE_URL",
    required: false,
    defaultValue: "file:./dev.db",
    validator: (v) => {
      const trimmed = v.trim();
      return (
        trimmed.startsWith("file:") ||
        trimmed.startsWith("postgresql://") ||
        trimmed.startsWith("postgres://")
      );
    },
    description: "数据库连接字符串 (file: 或 postgresql://)",
    example: "file:./dev.db",
  },

  // === Server networking ===
  {
    name: "PORT",
    required: false,
    defaultValue: "13000",
    validator: portValidator,
    description: "服务端口号 (1-65535)",
    example: "13000",
  },
  {
    name: "AI_NOVEL_SERVER_PORT",
    required: false,
    validator: portValidator,
    description: "AI Novel 服务端口（覆盖 PORT）",
    example: "13000",
  },
  {
    name: "HOST",
    required: false,
    defaultValue: "localhost",
    validator: nonEmptyValidator,
    description: "服务监听地址",
    example: "0.0.0.0",
  },
  {
    name: "CORS_ORIGIN",
    required: false,
    validator: corsOriginValidator,
    description: "CORS 允许的来源（逗号分隔的 URL 列表）",
    example: "http://localhost:5173,https://myapp.com",
  },

  // === Logging ===
  {
    name: "LOG_LEVEL",
    required: false,
    defaultValue: "info",
    validator: logLevelValidator,
    description: "日志级别 (debug | info | warn | error)",
    example: "info",
  },

  // === Feature flags ===
  {
    name: "RAG_ENABLED",
    required: false,
    defaultValue: "true",
    validator: booleanValidator,
    description: "是否启用 RAG 功能",
    example: "true",
  },
  {
    name: "ALLOW_LAN",
    required: false,
    defaultValue: "true",
    validator: booleanValidator,
    description: "是否允许局域网访问",
    example: "false",
  },

  // === API Keys (warn only, can be configured via secretStore) ===
  {
    name: "DEEPSEEK_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "DeepSeek API 密钥 (sk-...)",
    example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "OPENAI_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "OpenAI API 密钥",
    example: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "ANTHROPIC_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "Anthropic API 密钥",
    example: "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "SILICONFLOW_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "SiliconFlow API 密钥",
    example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "XAI_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "xAI (Grok) API 密钥",
    example: "xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "KIMI_API_KEY",
    required: false,
    validator: apiKeyFormatValidator,
    description: "Kimi (Moonshot) API 密钥",
    example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
];

// ---- Core Validation Logic ----

function maskValue(name: string, value: string): string {
  const isKey = name.includes("KEY") || name.includes("SECRET") || name.includes("TOKEN");
  if (!isKey) return value;
  if (value.length <= 8) return "***";
  return value.slice(0, 4) + "***" + value.slice(-4);
}

export function validateEnvironment(): ValidationResult {
  const errors: EnvValidationError[] = [];
  const warnings: EnvValidationWarning[] = [];

  for (const def of ENV_VARIABLES) {
    const rawValue = process.env[def.name];
    const value = rawValue?.trim();

    // Missing or empty
    if (value === undefined || value === "") {
      if (def.required) {
        errors.push({
          name: def.name,
          message: `缺少必需的环境变量: ${def.name}`,
          suggestion: `请在 server/.env 中设置 ${def.name}=${def.example}`,
        });
      } else if (def.defaultValue !== undefined) {
        process.env[def.name] = def.defaultValue;
        warnings.push({
          name: def.name,
          message: `${def.name} 未设置，使用默认值: ${def.defaultValue}`,
        });
      }
      // optional vars without default: silently skip (e.g., optional API keys)
      continue;
    }

    // Format validation (only if a validator is defined)
    if (def.validator && !def.validator(value)) {
      if (def.required) {
        errors.push({
          name: def.name,
          message: `${def.name} 的值无效: "${maskValue(def.name, value)}"`,
          suggestion: `${def.description}。示例: ${def.example}`,
        });
      } else {
        warnings.push({
          name: def.name,
          message: `${def.name} 的值可能无效: "${maskValue(def.name, value)}"，建议格式: ${def.example}`,
        });
      }
    }
  }

  // Special check: at least one API key should be configured in production
  if (process.env.NODE_ENV === "production") {
    const apiKeyVars = ENV_VARIABLES.filter((d) => d.name.endsWith("_API_KEY"));
    const hasAnyKey = apiKeyVars.some((d) => {
      const val = process.env[d.name]?.trim();
      return val && val.length >= 8;
    });
    if (!hasAnyKey) {
      warnings.push({
        name: "API_KEYS",
        message:
          "生产环境未配置任何 LLM API 密钥。可通过环境变量或系统设置界面配置。",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---- Report Output ----

export function printValidationReport(result: ValidationResult): void {
  const lines: string[] = [];

  lines.push("");
  lines.push(gray("══════════════════════════════════════════════"));
  lines.push(bold("  Environment Configuration Report"));
  lines.push(gray("══════════════════════════════════════════════"));
  lines.push("");

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(bold("  Warnings:"));
    for (const w of result.warnings) {
      lines.push(`    ${yellow("!")} ${cyan(w.name)}: ${w.message}`);
    }
    lines.push("");
  }

  // Required vars status
  const requiredVars = ENV_VARIABLES.filter((v) => v.required);
  if (requiredVars.length > 0) {
    lines.push(bold("  Required Variables:"));
    for (const def of requiredVars) {
      const value = process.env[def.name];
      if (value && value.trim()) {
        lines.push(`    ${green("OK")}  ${def.name}: ${maskValue(def.name, value.trim())}`);
      } else {
        lines.push(`    ${red("MISSING")}  ${def.name}: ${red("NOT SET")}`);
      }
    }
    lines.push("");
  }

  // API key status
  const apiKeyVars = ENV_VARIABLES.filter((d) => d.name.endsWith("_API_KEY"));
  lines.push(bold("  API Keys:"));
  for (const def of apiKeyVars) {
    const value = process.env[def.name];
    if (value && value.trim()) {
      lines.push(`    ${green("OK")}  ${def.name}: ${maskValue(def.name, value.trim())}`);
    } else {
      lines.push(`    ${gray("-")}  ${def.name}: ${gray("(not set - can be configured via secretStore)")}`);
    }
  }
  lines.push("");

  // Optional vars status
  const optionalNonKeyVars = ENV_VARIABLES.filter(
    (d) => !d.required && !d.name.endsWith("_API_KEY"),
  );
  lines.push(bold("  Optional Variables:"));
  for (const def of optionalNonKeyVars) {
    const value = process.env[def.name];
    const display = value && value.trim()
      ? value.trim()
      : gray(`(using default: ${def.defaultValue ?? "none"})`);
    lines.push(`    ${cyan("o")}  ${def.name}: ${display}`);
  }
  lines.push("");

  // Errors (fatal)
  if (result.errors.length > 0) {
    lines.push(bold(red("  === CONFIGURATION ERRORS ===")));
    lines.push("");
    for (const err of result.errors) {
      lines.push(`    ${red("ERROR")}  ${err.name}`);
      lines.push(`           ${err.message}`);
      lines.push(`           ${gray(err.suggestion)}`);
    }
    lines.push("");
    lines.push(red("  Server startup blocked. Fix the errors above and restart."));
    lines.push("");
  }

  lines.push(gray("══════════════════════════════════════════════"));
  lines.push("");

  // Write to stderr so it appears before other log output
  process.stderr.write(lines.join("\n"));

  // Also log structured summary for log aggregation
  if (result.valid) {
    process.stderr.write(
      `${green("Environment validation: PASSED")} (${result.warnings.length} warning(s))\n\n`,
    );
  }
}

// ---- Re-export for external use ----

export { ENV_VARIABLES };
