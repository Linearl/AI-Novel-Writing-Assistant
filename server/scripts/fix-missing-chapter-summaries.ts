/**
 * fix-missing-chapter-summaries.ts
 *
 * 修复所有缺少 ChapterSummary 的章节。
 * 使用 syncChapterArtifacts 函数重新生成摘要。
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// Resolve database path (same logic as server/src/db/prisma.ts)
function resolveDatabasePath(): string {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = dbUrl.slice("file:".length) || "./dev.db";
  if (path.isAbsolute(filePath)) return filePath;
  // Resolve relative to server/ directory
  return path.resolve(__dirname, "..", filePath);
}

const sqlitePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(sqlitePath), { recursive: true, mode: 0o700 });

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: `file:${sqlitePath}`,
    timeout: 15000,
  }),
});

// 从 syncChapterArtifacts 提取的摘要生成逻辑
function extractFacts(content: string): Array<{ category: "plot" | "character" | "world"; content: string }> {
  const lines = content.split(/[\n。！？"]/).map((item) => item.trim()).filter((item) => item.length >= 8).slice(0, 6);
  return lines.map((line) => {
    if (/世界|地理|宗门|王朝|大陆|规则/.test(line)) {
      return { category: "world" as const, content: line };
    }
    if (/主角|反派|角色|他|她/.test(line)) {
      return { category: "character" as const, content: line };
    }
    return { category: "plot" as const, content: line };
  });
}

function briefSummary(content: string, facts: Array<{ category: string; content: string }>): string {
  const text = content.replace(/\s+/g, " ").trim();
  if (!text) return "";

  const pickUnique = (items: string[], maxItems = 3): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item)) continue;
      seen.add(item);
      result.push(item);
      if (result.length >= maxItems) break;
    }
    return result;
  };

  const plotEvents = pickUnique(facts.filter((item) => item.category === "plot").map((item) => item.content), 2);
  const characterStates = pickUnique(facts.filter((item) => item.category === "character").map((item) => item.content), 2);
  const worldFacts = pickUnique(facts.filter((item) => item.category === "world").map((item) => item.content), 1);

  const blocks: string[] = [];
  if (plotEvents.length > 0) blocks.push(`Plot: ${plotEvents.join("")}`);
  if (characterStates.length > 0) blocks.push(`Character: ${characterStates.join("")}`);
  if (worldFacts.length > 0) blocks.push(`World: ${worldFacts.join("")}`);

  if (blocks.length > 0) return blocks.join("\n");
  if (text.length <= 220) return text;
  return `${text.slice(0, 220)}...`;
}

async function main() {
  console.log("🔍 Finding chapters without ChapterSummary...");

  const missingChapters = await prisma.chapter.findMany({
    where: {
      chapterSummary: null,
    },
    select: {
      id: true,
      novelId: true,
      order: true,
      title: true,
      content: true,
    },
    orderBy: [{ novelId: "asc" }, { order: "asc" }],
  });

  console.log(` Found ${missingChapters.length} chapters without summary`);

  if (missingChapters.length === 0) {
    console.log("✅ All chapters have summaries");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const chapter of missingChapters) {
    const content = chapter.content ?? "";
    if (!content.trim()) {
      console.log(`⏭️  Skipping ch${chapter.order} "${chapter.title}" (no content)`);
      continue;
    }

    try {
      const facts = extractFacts(content);
      const summary = briefSummary(content, facts);

      await prisma.chapterSummary.upsert({
        where: { chapterId: chapter.id },
        update: {
          summary,
          keyEvents: facts.map((item) => item.content).slice(0, 3).join(""),
          characterStates: facts
            .filter((item) => item.category === "character")
            .map((item) => item.content)
            .slice(0, 3)
            .join(""),
        },
        create: {
          novelId: chapter.novelId,
          chapterId: chapter.id,
          summary,
          keyEvents: facts.map((item) => item.content).slice(0, 3).join(""),
          characterStates: facts
            .filter((item) => item.category === "character")
            .map((item) => item.content)
            .slice(0, 3)
            .join(""),
        },
      });

      successCount++;
      console.log(`✅ ch${chapter.order} "${chapter.title}" - summary generated`);
    } catch (error) {
      failCount++;
      console.error(`❌ ch${chapter.order} "${chapter.title}" - failed:`, error);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏭️  Skipped: ${missingChapters.length - successCount - failCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
