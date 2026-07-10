import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { prisma } from "../../db/prisma";

// --- 路径解析（兼容 src 和 dist 两种运行环境） ---

function resolveDataDir(subdir: string): string {
  // 从 dist/services/styleEngine/ 到 src/data/ 需要 ../../../src/data
  const srcDir = resolve(__dirname, "../../../src/data", subdir);
  if (existsSync(srcDir)) return srcDir;
  // 从 src/services/styleEngine/ 到 data/ 需要 ../../data
  const relDir = resolve(__dirname, "../../data", subdir);
  return relDir;
}

// --- YAML 解析（轻量内联，不引入外部依赖） ---

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let inArray = false;
  let arrayItems: string[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // 数组项（以 "- " 开头）
    if (/^\s+-\s/.test(line)) {
      const value = line.replace(/^\s*-\s*/, "").trim();
      if (currentKey && inArray) {
        arrayItems.push(unquote(value));
      }
      continue;
    }

    // 普通 key: value
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
    if (match) {
      // 保存前一个数组
      if (currentKey && inArray) {
        result[currentKey] = arrayItems;
        arrayItems = [];
        inArray = false;
      }

      currentKey = match[1];
      const value = match[2].trim();

      if (value === "" || value === "[]") {
        // 可能是数组的开始，或者是空数组
        if (value === "[]") {
          result[currentKey] = [];
          currentKey = null;
        } else {
          inArray = true;
        }
      } else {
        result[currentKey] = parseYamlValue(unquote(value));
        inArray = false;
      }
    }
  }

  // 处理最后一个数组
  if (currentKey && inArray && arrayItems.length > 0) {
    result[currentKey] = arrayItems;
  }

  return result;
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYamlValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~" || value === "") return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

// --- MD frontmatter 解析 ---

function parseMdFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)/);
    if (kv) {
      frontmatter[kv[1]] = kv[2].trim();
    }
  }
  return { frontmatter, body: match[2] };
}

// --- 反 AI 规则同步 ---

interface AntiAiRuleYaml {
  key: string;
  name: string;
  type: string;
  severity: string;
  description: string;
  detectPatterns: string[];
  rewriteSuggestion?: string;
  promptInstruction?: string;
  autoRewrite?: boolean;
  defaultEnabled?: boolean;
  defaultGlobalBaseline?: boolean;
}

const ANTI_AI_RULES_DIR = resolveDataDir("antiAiRules");

export async function syncAntiAiRulesFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only",
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  let files: string[];
  try {
    files = readdirSync(ANTI_AI_RULES_DIR)
      .filter((f) => extname(f) === ".yaml" || extname(f) === ".yml");
  } catch {
    result.errors.push(`反 AI 规则目录不存在: ${ANTI_AI_RULES_DIR}`);
    return result;
  }

  for (const file of files) {
    const filePath = join(ANTI_AI_RULES_DIR, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = parseSimpleYaml(content) as unknown as AntiAiRuleYaml;

      if (!data.key || !data.name || !data.type) {
        result.errors.push(`${file}: 缺少必填字段 (key/name/type)`);
        continue;
      }

      const existing = await prisma.antiAiRule.findUnique({
        where: { key: data.key },
        select: { id: true },
      });

      const writeData = {
        name: data.name,
        type: data.type as any,
        severity: data.severity as any,
        description: data.description ?? "",
        detectPatternsJson: JSON.stringify(data.detectPatterns ?? []),
        rewriteSuggestion: data.rewriteSuggestion ?? null,
        promptInstruction: data.promptInstruction ?? null,
        autoRewrite: data.autoRewrite ?? false,
        enabled: data.defaultEnabled ?? true,
        globalBaselineEnabled: data.defaultGlobalBaseline ?? false,
      };

      if (existing) {
        if (mode === "sync_existing") {
          await prisma.antiAiRule.update({
            where: { key: data.key },
            data: writeData,
          });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        await prisma.antiAiRule.create({
          data: { key: data.key, ...writeData },
        });
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`${file}: ${err.message}`);
    }
  }

  return result;
}

// --- 文笔技法同步 ---

const WRITING_TECHNIQUES_DIR = resolveDataDir("writingTechniques");

export async function syncWritingTechniquesFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only",
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  let files: string[];
  try {
    files = readdirSync(WRITING_TECHNIQUES_DIR)
      .filter((f) => extname(f) === ".md");
  } catch {
    result.errors.push(`文笔技法目录不存在: ${WRITING_TECHNIQUES_DIR}`);
    return result;
  }

  for (const file of files) {
    const filePath = join(WRITING_TECHNIQUES_DIR, file);
    const key = basename(file, ".md");
    try {
      const content = readFileSync(filePath, "utf-8");
      const { frontmatter } = parseMdFrontmatter(content);

      if (!frontmatter.name || !frontmatter.description) {
        result.errors.push(`${file}: 缺少 frontmatter (name/description)`);
        continue;
      }

      const existing = await prisma.writingTechnique.findUnique({
        where: { key },
        select: { id: true },
      });

      const writeData = {
        name: frontmatter.name,
        description: frontmatter.description,
        category: frontmatter.category ?? null,
        filePath: `server/src/data/writingTechniques/${file}`,
      };

      if (existing) {
        if (mode === "sync_existing") {
          await prisma.writingTechnique.update({
            where: { key },
            data: writeData,
          });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        await prisma.writingTechnique.create({
          data: {
            key,
            ...writeData,
            enabled: false, // 默认不启用
          },
        });
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`${file}: ${err.message}`);
    }
  }

  return result;
}

// --- 词汇规则同步 ---

const VOCAB_RULES_DIR = resolveDataDir("vocabularyRules");

export interface VocabRuleYaml {
  key: string;
  name: string;
  pattern: string;
  matchType: string;
  category: string;
  weight: number;
  suggestions: string[];
}

interface VocabRuleFile {
  rules: VocabRuleYaml[];
}

export async function syncVocabularyRulesFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only",
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  let files: string[];
  try {
    files = readdirSync(VOCAB_RULES_DIR)
      .filter((f) => extname(f) === ".yaml" || extname(f) === ".yml");
  } catch {
    result.errors.push(`词汇规则目录不存在: ${VOCAB_RULES_DIR}`);
    return result;
  }

  for (const file of files) {
    const filePath = join(VOCAB_RULES_DIR, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = parseSimpleYaml(content) as unknown as VocabRuleFile;

      if (!data.rules || !Array.isArray(data.rules)) {
        result.errors.push(`${file}: 缺少 rules 数组`);
        continue;
      }

      for (const rule of data.rules) {
        const ruleKey = typeof rule.key === "string" ? rule.key : String(rule.key ?? "");
        const ruleName = typeof rule.name === "string" ? rule.name : String(rule.name ?? "");
        const rulePattern = typeof rule.pattern === "string" ? rule.pattern : String(rule.pattern ?? "");

        if (!ruleKey || !ruleName || !rulePattern) {
          result.errors.push(`${file}/${ruleKey || "unknown"}: 缺少必填字段 (key/name/pattern)`);
          continue;
        }

        const existing = await prisma.vocabularyRule.findUnique({
          where: { key: ruleKey },
          select: { id: true },
        });

        const writeData = {
          name: ruleName,
          pattern: rulePattern,
          matchType: (typeof rule.matchType === "string" ? rule.matchType : "word"),
          category: (typeof rule.category === "string" ? rule.category : "replaceable_word"),
          weight: typeof rule.weight === "number" ? rule.weight : 0.5,
          suggestions: JSON.stringify(
            Array.isArray(rule.suggestions) ? rule.suggestions : [],
          ),
        };

        if (existing) {
          if (mode === "sync_existing") {
            await prisma.vocabularyRule.update({
              where: { key: ruleKey },
              data: writeData,
            });
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          await prisma.vocabularyRule.create({
            data: { key: ruleKey, ...writeData },
          });
          result.created++;
        }
      }
    } catch (err: any) {
      result.errors.push(`${file}: ${err.message}`);
    }
  }

  return result;
}

// --- 聚合入口 ---

export async function syncAllFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only",
) {
  const [antiAi, techniques, vocabulary] = await Promise.all([
    syncAntiAiRulesFromFileSystem(mode),
    syncWritingTechniquesFromFileSystem(mode),
    syncVocabularyRulesFromFileSystem(mode),
  ]);

  return {
    antiAiRules: antiAi,
    writingTechniques: techniques,
    vocabularyRules: vocabulary,
  };
}
