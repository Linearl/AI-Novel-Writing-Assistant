/**
 * loader — 从 YAML 文件加载 PromptDefinition。
 *
 * - id 格式 "category.name" 映射到文件 "category-name.yaml"
 * - 开发环境每次重新加载，生产环境按 mtime 缓存
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import type { PromptDefinition } from "./types";

/** prompts YAML 文件所在目录 */
const PROMPTS_DIR = path.resolve(__dirname, "../../prompts");

/** mtime 缓存：id → { mtimeMs, definition } */
const cache = new Map<string, { mtimeMs: number; definition: PromptDefinition }>();

/**
 * 将 PromptAsset id（"category.name"）映射为文件名（"category-name.yaml"）。
 */
function idToFilePath(id: string): string {
  const filename = id.replace(/\./g, "-") + ".yaml";
  return path.join(PROMPTS_DIR, filename);
}

/**
 * 从 YAML 文件加载并解析 PromptDefinition。
 *
 * @throws {Error} 文件不存在或解析失败时抛出
 */
export function loadPrompt(id: string): PromptDefinition {
  const filePath = idToFilePath(id);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[prompt-loader] Prompt YAML file not found: ${filePath} (id="${id}")`,
    );
  }

  const stat = fs.statSync(filePath);

  // 生产环境 mtime 缓存
  if (process.env.NODE_ENV === "production") {
    const cached = cache.get(id);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.definition;
    }
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  let parsed: Record<string, unknown>;
  try {
    parsed = yaml.load(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `[prompt-loader] Failed to parse YAML for id="${id}": ${(err as Error).message}`,
    );
  }

  if (!parsed || typeof parsed.id !== "string" || typeof parsed.system !== "string") {
    throw new Error(
      `[prompt-loader] Invalid PromptDefinition structure for id="${id}": missing required "id" or "system" fields`,
    );
  }

  const definition: PromptDefinition = {
    id: parsed.id as string,
    version: String(parsed.version ?? "1"),
    system: parsed.system as string,
    user: typeof parsed.user === "string" ? (parsed.user as string) : undefined,
    variables: Array.isArray(parsed.variables) ? (parsed.variables as string[]) : [],
  };

  if (process.env.NODE_ENV === "production") {
    cache.set(id, { mtimeMs: stat.mtimeMs, definition });
  }

  return definition;
}

/**
 * 清除缓存（用于测试或热重载）。
 */
export function clearPromptCache(): void {
  cache.clear();
}
