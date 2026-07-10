import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { prisma } from "../../db/prisma";

// --- 轻量 YAML 解析（复用现有实现） ---

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let inArray = false;
  let arrayItems: string[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // 数组项（以 "- " 开头）
    if (/^\s*-\s/.test(line)) {
      const value = line.replace(/^\s*-\s*/, "").trim();
      if (currentKey && inArray) {
        arrayItems.push(unquoteYaml(value));
      }
      continue;
    }

    // 普通 key: value
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
    if (match) {
      if (currentKey && inArray) {
        result[currentKey] = arrayItems;
        arrayItems = [];
        inArray = false;
      }

      currentKey = match[1];
      const value = match[2].trim();

      if (value === "" || value === "[]") {
        if (value === "[]") {
          result[currentKey] = [];
          currentKey = null;
        } else {
          inArray = true;
        }
      } else {
        result[currentKey] = parseYamlValue(unquoteYaml(value));
        inArray = false;
      }
    }
  }

  if (currentKey && inArray && arrayItems.length > 0) {
    result[currentKey] = arrayItems;
  }

  return result;
}

function unquoteYaml(value: string): string {
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

// --- 路径解析 ---

function resolveDataDir(subdir: string): string {
  const srcDir = resolve(__dirname, "../../../src/data", subdir);
  if (existsSync(srcDir)) return srcDir;
  const relDir = resolve(__dirname, "../../data", subdir);
  return relDir;
}

const VOCAB_RULES_DIR = resolveDataDir("vocabularyRules");

// --- 规则类型 ---

interface VocabRuleYaml {
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

// --- 扫描结果类型 ---

export interface VocabHit {
  ruleKey: string;
  ruleName: string;
  category: string;
  weight: number;
  /** 命中的具体文本片段 */
  match: string;
  /** 在正文中的字符位置 */
  position: number;
  suggestions: string[];
}

export interface VocabScanResult {
  hits: VocabHit[];
  /** 按类别统计命中数 */
  summaryByCategory: Record<string, number>;
  /** 千字命中率（总命中数 / 千字数） */
  hitsPerThousand: number;
  /** 实时评分 */
  affected: boolean;
  scorePenalty: number;
}

// --- 扫描器 ---

export class VocabAuditScanner {
  /**
   * 从数据库加载所有启用的规则
   */
  async loadRules(): Promise<{
    key: string;
    name: string;
    pattern: string;
    matchType: string;
    category: string;
    weight: number;
    suggestions: string[];
  }[]> {
    const rules = await prisma.vocabularyRule.findMany({
      where: { enabled: true },
      select: {
        key: true,
        name: true,
        pattern: true,
        matchType: true,
        category: true,
        weight: true,
        suggestions: true,
      },
    });

    return rules.map((r) => ({
      ...r,
      suggestions: parseSuggestions(r.suggestions),
    }));
  }

  /**
   * 扫描一篇正文
   */
  scan(
    content: string,
    rules: Array<{
      key: string;
      name: string;
      pattern: string;
      matchType: string;
      category: string;
      weight: number;
      suggestions: string[];
    }>,
  ): VocabScanResult {
    const hits: VocabHit[] = [];

    for (const rule of rules) {
      const matches = this.findMatches(content, rule.pattern, rule.matchType);
      for (const match of matches) {
        hits.push({
          ruleKey: rule.key,
          ruleName: rule.name,
          category: rule.category,
          weight: rule.weight,
          match: match.match,
          position: match.position,
          suggestions: rule.suggestions,
        });
      }
    }

    // 统计
    const summaryByCategory: Record<string, number> = {};
    for (const hit of hits) {
      summaryByCategory[hit.category] = (summaryByCategory[hit.category] || 0) + 1;
    }

    const wordCount = countChineseWords(content);
    const hitsPerThousand = wordCount > 0 ? (hits.length / (wordCount / 1000)) : 0;

    const { affected, penalty } = this.computeScorePenalty(hits, wordCount);

    return {
      hits,
      summaryByCategory,
      hitsPerThousand: Math.round(hitsPerThousand * 100) / 100,
      affected,
      scorePenalty: penalty,
    };
  }

  /**
   * 评分衰减公式：分段阈值
   * 只统计僵尸词（权重 >= 0.7）的千字命中数
   */
  computeScorePenalty(
    hits: VocabHit[],
    wordCount: number,
  ): { affected: boolean; penalty: number } {
    const zombieHits = hits.filter((h) => h.weight >= 0.7);
    const zombiePerThousand = wordCount > 0 ? zombieHits.length / (wordCount / 1000) : 0;

    if (zombiePerThousand < 3) {
      return { affected: false, penalty: 0 };
    }
    if (zombiePerThousand <= 8) {
      return { affected: true, penalty: 5 };
    }
    return { affected: true, penalty: 10 };
  }

  /**
   * 扫描结果转换为 AuditReport 格式
   */
  toAuditIssues(result: VocabScanResult): Array<{
    severity: "low" | "medium" | "high" | "critical";
    code: string;
    description: string;
    evidence: string;
    fixSuggestion: string;
  }> {
    if (!result.affected && result.hits.length === 0) return [];

    const issues: Array<{
      severity: "low" | "medium" | "high" | "critical";
      code: string;
      description: string;
      evidence: string;
      fixSuggestion: string;
    }> = [];

    // 按类别分组
    const byCategory: Record<string, VocabHit[]> = {};
    for (const hit of result.hits) {
      if (!byCategory[hit.category]) byCategory[hit.category] = [];
      byCategory[hit.category].push(hit);
    }

    const categoryLabels: Record<string, string> = {
      zombie_word: "僵尸词",
      disruptor_word: "隔断词",
      replaceable_word: "高频替换词",
    };

    for (const [category, catHits] of Object.entries(byCategory)) {
      const label = categoryLabels[category] || category;
      const topHits = this.topHits(catHits, 5);

      issues.push({
        severity: category === "zombie_word" ? "high" : "medium",
        code: `Vocab_${category}`,
        description: `[${label}] 共命中 ${catHits.length} 次，千字命中率 ${result.hitsPerThousand}`,
        evidence: topHits
          .map((h) => `"${h.ruleName}" ×${this.countByRule(catHits, h.ruleKey)}: "${h.match}"`)
          .join("；"),
        fixSuggestion:
          category === "zombie_word"
            ? "建议将笼统词汇替换为具体的感官细节和动作描写"
            : category === "disruptor_word"
              ? "建议删减冗余连接词和感官过滤词，让画面直接呈现"
              : "建议用近义词替换高频重复词，增加语言多样性",
      });
    }

    return issues;
  }

  /**
   * 扫描结果转换为 ReviewIssue 格式
   */
  toReviewIssues(result: VocabScanResult): Array<{
    category: string;
    description: string;
    fixSuggestion: string;
  }> {
    return this.toAuditIssues(result).map((issue) => ({
      category: "language",
      description: issue.description,
      fixSuggestion: `${issue.fixSuggestion}。命中详情：${issue.evidence}`,
    }));
  }

  /**
   * 生成修复 prompt 片段
   */
  toRepairContext(result: VocabScanResult): string {
    if (result.hits.length === 0) return "";

    const lines: string[] = ["## 词汇扫描结果\n"];

    const categoryLabels: Record<string, string> = {
      zombie_word: "僵尸词（权重高，建议替换为更具体的表达）",
      disruptor_word: "隔断词（建议适当减少使用频率）",
      replaceable_word: "高频替换词（建议使用近义词替换）",
    };

    const byCategory: Record<string, VocabHit[]> = {};
    for (const hit of result.hits) {
      if (!byCategory[hit.category]) byCategory[hit.category] = [];
      byCategory[hit.category].push(hit);
    }

    for (const [category, catHits] of Object.entries(byCategory)) {
      const label = categoryLabels[category] || category;
      lines.push(`### ${label}\n`);

      // 按规则去重统计
      const ruleCounts = new Map<string, { hit: VocabHit; count: number }>();
      for (const h of catHits) {
        const existing = ruleCounts.get(h.ruleKey);
        if (existing) {
          existing.count++;
        } else {
          ruleCounts.set(h.ruleKey, { hit: h, count: 1 });
        }
      }

      for (const [_key, { hit, count }] of ruleCounts) {
        const suggestions = hit.suggestions.length > 0 ? ` → ${hit.suggestions.join("；")}` : "";
        lines.push(`- "${hit.ruleName}" ×${count}${suggestions}`);
      }
      lines.push("");
    }

    if (result.affected) {
      lines.push(`> 本章千字僵尸词命中率 ${result.hitsPerThousand}，评分扣除 ${result.scorePenalty} 分。请在修复时有针对性地优化。`);
    }

    return lines.join("\n");
  }

  // --- 私有方法 ---

  private findMatches(
    content: string,
    pattern: string,
    matchType: string,
  ): Array<{ position: number; match: string }> {
    const results: Array<{ position: number; match: string }> = [];
    try {
      switch (matchType) {
        case "word":
          return this.findWordMatches(content, pattern);
        case "contains":
          return this.findContainsMatches(content, pattern);
        case "regex":
          return this.findRegexMatches(content, pattern);
        default:
          return this.findWordMatches(content, pattern);
      }
    } catch {
      return results;
    }
  }

  private findWordMatches(
    content: string,
    pattern: string,
  ): Array<{ position: number; match: string }> {
    const results: Array<{ position: number; match: string }> = [];
    // 中文词匹配使用 indexOf，因为中文没有 \b 边界
    const isChinese = /[一-鿿]/.test(pattern);
    if (isChinese) {
      let pos = 0;
      while (pos < content.length) {
        const idx = content.indexOf(pattern, pos);
        if (idx === -1) break;
        results.push({ position: idx, match: pattern });
        pos = idx + pattern.length;
      }
    } else {
      const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        results.push({ position: match.index, match: match[0] });
      }
    }
    return results;
  }

  private findContainsMatches(
    content: string,
    pattern: string,
  ): Array<{ position: number; match: string }> {
    const results: Array<{ position: number; match: string }> = [];
    let pos = 0;
    while (pos < content.length) {
      const idx = content.indexOf(pattern, pos);
      if (idx === -1) break;
      results.push({ position: idx, match: pattern });
      pos = idx + pattern.length;
    }
    return results;
  }

  private findRegexMatches(
    content: string,
    pattern: string,
  ): Array<{ position: number; match: string }> {
    const results: Array<{ position: number; match: string }> = [];
    const regex = new RegExp(pattern, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      results.push({ position: match.index, match: match[0] });
    }
    return results;
  }

  private topHits(hits: VocabHit[], n: number): VocabHit[] {
    const byRule = new Map<string, VocabHit>();
    for (const h of hits) {
      if (!byRule.has(h.ruleKey)) byRule.set(h.ruleKey, h);
    }
    return Array.from(byRule.values()).slice(0, n);
  }

  private countByRule(hits: VocabHit[], ruleKey: string): number {
    return hits.filter((h) => h.ruleKey === ruleKey).length;
  }
}

// --- 工具函数 ---

function countChineseWords(text: string): number {
  const chineseChars = text.match(/[一-鿿]/g);
  return chineseChars ? chineseChars.length : text.replace(/\s/g, "").length;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSuggestions(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// --- 单例 ---

export const vocabAuditScanner = new VocabAuditScanner();
