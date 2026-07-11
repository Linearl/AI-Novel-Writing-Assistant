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
// 支持：扁平 key-value、纯字符串数组、对象数组（含嵌套子数组）
// 策略：用缩进→上下文 Map，每个缩进级别记录当前容器和正在构建的对象

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

interface YamlCtx {
  container: Record<string, unknown> | unknown[];
  currentObj: Record<string, unknown> | null;
  arrayKey: string | null; // 当前对象中活跃的子数组属性名（如 "suggestions"）
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // 每个缩进级别的上下文；-1 = 根
  const ctxMap = new Map<number, YamlCtx>();
  ctxMap.set(-1, { container: result, currentObj: null, arrayKey: null });

  /** 找到 <= indent 的最大缩进级别的上下文 */
  function findCtx(indent: number): YamlCtx {
    let bestKey = -Infinity;
    for (const k of ctxMap.keys()) {
      if (k <= indent && k > bestKey) bestKey = k;
    }
    return ctxMap.get(bestKey)!;
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);

    // --- 数组项（"- " 开头） ---
    if (/^\s*-\s/.test(line)) {
      const afterDash = line.replace(/^\s*-\s*/, "");
      const kvMatch = afterDash.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);

      if (kvMatch) {
        // "- key: value" → 对象数组中的新对象
        const ctx = findCtx(indent);

        if (Array.isArray(ctx.container)) {
          // 父容器是数组 → 保存前一个对象，开始新对象
          if (ctx.currentObj) {
            ctx.container.push(ctx.currentObj);
          }
          const obj: Record<string, unknown> = {};
          obj[kvMatch[1]] = kvMatch[2].trim() === "" ? null : parseYamlValue(unquote(kvMatch[2].trim()));
          ctx.currentObj = obj;
          ctx.arrayKey = null;
          // 注册当前缩进上下文指向同一个数组容器
          ctxMap.set(indent, ctx);
        } else {
          // 父容器不是数组 → 检查是否有 arrayKey（如 rules: 后首次遇到 - key:）
          if (ctx.arrayKey) {
            const arr: unknown[] = [];
            (ctx.container as Record<string, unknown>)[ctx.arrayKey] = arr;
            ctx.arrayKey = null;
            const obj: Record<string, unknown> = {};
            obj[kvMatch[1]] = kvMatch[2].trim() === "" ? null : parseYamlValue(unquote(kvMatch[2].trim()));
            ctxMap.set(indent, { container: arr, currentObj: obj, arrayKey: null });
          } else {
            // 检查上级缩进是否有 arrayKey（如 suggestions: 后的子数组）
            const parentCtx = findCtx(indent - 2);
            if (parentCtx && parentCtx.arrayKey && parentCtx.currentObj) {
              const arr: unknown[] = [];
              parentCtx.currentObj[parentCtx.arrayKey] = arr;
              parentCtx.arrayKey = null;
              const obj: Record<string, unknown> = {};
              obj[kvMatch[1]] = kvMatch[2].trim() === "" ? null : parseYamlValue(unquote(kvMatch[2].trim()));
              ctxMap.set(indent, { container: arr, currentObj: obj, arrayKey: null });
            }
          }
        }
      } else {
        // 纯字符串数组项
        const ctx = findCtx(indent);
        const value = afterDash.trim();
        if (Array.isArray(ctx.container)) {
          if (ctx.currentObj && ctx.arrayKey) {
            // 追加到当前对象的子数组属性
            let arr = ctx.currentObj[ctx.arrayKey];
            if (arr == null) { arr = []; ctx.currentObj[ctx.arrayKey] = arr; }
            if (Array.isArray(arr)) arr.push(unquote(value));
          } else {
            // 追加到父数组
            ctx.container.push(unquote(value));
          }
        }
      }
      continue;
    }

    // --- key: value 行 ---
    const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      const ctx = findCtx(indent);

      if (value === "" || value === "[]") {
        if (value === "[]") {
          if (Array.isArray(ctx.container)) {
            if (ctx.currentObj) ctx.currentObj[key] = [];
          } else {
            ctx.container[key] = [];
          }
        } else {
          // 空值 → 标记为活跃子数组属性
          if (Array.isArray(ctx.container)) {
            if (ctx.currentObj) {
              ctx.currentObj[key] = null;
              ctx.arrayKey = key;
            }
          } else {
            ctx.container[key] = null;
            ctx.arrayKey = key;
          }
        }
      } else {
        if (Array.isArray(ctx.container)) {
          if (ctx.currentObj) ctx.currentObj[key] = parseYamlValue(unquote(value));
        } else {
          ctx.container[key] = parseYamlValue(unquote(value));
        }
      }
    }
  }

  // 收尾：保存所有未完成的对象
  for (const ctx of ctxMap.values()) {
    if (Array.isArray(ctx.container) && ctx.currentObj) {
      ctx.container.push(ctx.currentObj);
      ctx.currentObj = null;
    }
  }

  return result;
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

// --- 氛围卡同步 ---

const ATMOSPHERE_CARDS_DIR = resolveDataDir("atmosphereCards");

export async function syncAtmosphereCardsFromFileSystem(
  mode: "missing_only" | "sync_existing" = "missing_only",
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  let files: string[];
  try {
    files = readdirSync(ATMOSPHERE_CARDS_DIR)
      .filter((f) => extname(f) === ".md");
  } catch {
    result.errors.push(`氛围卡目录不存在: ${ATMOSPHERE_CARDS_DIR}`);
    return result;
  }

  for (const file of files) {
    const filePath = join(ATMOSPHERE_CARDS_DIR, file);
    const key = basename(file, ".md");
    try {
      const content = readFileSync(filePath, "utf-8");
      const { frontmatter } = parseMdFrontmatter(content);

      if (!frontmatter.name || !frontmatter.description) {
        result.errors.push(`${file}: 缺少 frontmatter (name/description)`);
        continue;
      }

      const existing = await prisma.atmosphereCard.findUnique({
        where: { key },
        select: { id: true },
      });

      const writeData = {
        name: frontmatter.name,
        description: frontmatter.description,
        category: frontmatter.category ?? null,
        filePath: `server/src/data/atmosphereCards/${file}`,
        applicableEmotions: frontmatter.applicableEmotions ?? "[]",
        triggerKeywords: frontmatter.triggerKeywords ?? "[]",
      };

      if (existing) {
        if (mode === "sync_existing") {
          await prisma.atmosphereCard.update({ where: { key }, data: writeData });
          result.updated++;
        } else {
          result.skipped++;
        }
      } else {
        await prisma.atmosphereCard.create({
          data: { key, ...writeData, enabled: false },
        });
        result.created++;
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
  const [antiAi, techniques, vocabulary, atmosphere] = await Promise.all([
    syncAntiAiRulesFromFileSystem(mode),
    syncWritingTechniquesFromFileSystem(mode),
    syncVocabularyRulesFromFileSystem(mode),
    syncAtmosphereCardsFromFileSystem(mode),
  ]);

  return {
    antiAiRules: antiAi,
    writingTechniques: techniques,
    vocabularyRules: vocabulary,
    atmosphereCards: atmosphere,
  };
}
