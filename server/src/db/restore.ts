/**
 * 数据库恢复脚本 — 从 temp/db-backup.json 恢复数据
 *
 * 注意：此脚本适用于 R7033 迁移后的 schema（含 bookFramingJson 等 JSON 列）
 * 会自动将旧的独立字段合并为 JSON 列
 */
import { prisma } from "./prisma";
import { logger } from "../services/logging/LoggerService";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface BackupData {
  novel: any[];
  chapter: any[];
  character: any[];
  world: any[];
  characterRelation: any[];
  styleProfile: any[];
  styleBinding: any[];
  styleProfileAntiAiRule: any[];
  antiAiRule: any[];
  knowledgeDocument: any[];
}

function transformNovel(n: any) {
  const {
    bookSellingPoint, competingFeel, first30ChapterPromise,
    projectStatus, storylineStatus, outlineStatus, resourceReadyScore,
    sourceKnowledgeDocumentId, continuationBookAnalysisId, continuationBookAnalysisSections,
    storyWorldSliceJson, storyWorldSliceOverridesJson, storyWorldSliceSchemaVersion,
    ...rest
  } = n;

  return {
    ...rest,
    bookFramingJson: (bookSellingPoint || competingFeel || first30ChapterPromise)
      ? JSON.stringify({ bookSellingPoint, competingFeel, first30ChapterPromise })
      : null,
    setupProgressJson: (projectStatus || storylineStatus || outlineStatus || resourceReadyScore != null)
      ? JSON.stringify({ projectStatus, storylineStatus, outlineStatus, resourceReadyScore })
      : null,
    continuationSetupJson: (sourceKnowledgeDocumentId || continuationBookAnalysisId || continuationBookAnalysisSections)
      ? JSON.stringify({ sourceKnowledgeDocumentId, continuationBookAnalysisId, continuationBookAnalysisSections })
      : null,
    storyWorldSliceCacheJson: (storyWorldSliceJson || storyWorldSliceOverridesJson || storyWorldSliceSchemaVersion != null)
      ? JSON.stringify({ storyWorldSliceJson, storyWorldSliceOverridesJson, storyWorldSliceSchemaVersion })
      : null,
  };
}

async function main() {
  const backupPath = resolve(__dirname, "../../../temp/db-backup.json");
  const raw = readFileSync(backupPath, "utf-8");
  const data: BackupData = JSON.parse(raw);

  logger.info("[restore] Starting database restore from backup...", {
    novels: data.novel.length,
    chapters: data.chapter.length,
    characters: data.character.length,
    worlds: data.world.length,
  });

  // 1. Restore Worlds first (foreign key dependency)
  for (const w of data.world) {
    await prisma.world.upsert({
      where: { id: w.id },
      create: w,
      update: w,
    });
  }
  logger.info("[restore] Worlds restored:", data.world.length);

  // 2. Restore Novels (with field transformation)
  for (const n of data.novel) {
    const transformed = transformNovel(n);
    await prisma.novel.upsert({
      where: { id: n.id },
      create: transformed,
      update: transformed,
    });
  }
  logger.info("[restore] Novels restored:", data.novel.length);

  // 3. Restore Characters
  for (const c of data.character) {
    await prisma.character.upsert({
      where: { id: c.id },
      create: c,
      update: c,
    });
  }
  logger.info("[restore] Characters restored:", data.character.length);

  // 4. Restore CharacterRelations
  for (const r of data.characterRelation) {
    await prisma.characterRelation.upsert({
      where: { id: r.id },
      create: r,
      update: r,
    });
  }
  logger.info("[restore] CharacterRelations restored:", data.characterRelation.length);

  // 5. Restore Chapters
  for (const ch of data.chapter) {
    await prisma.chapter.upsert({
      where: { id: ch.id },
      create: ch,
      update: ch,
    });
  }
  logger.info("[restore] Chapters restored:", data.chapter.length);

  // 6. Restore StyleProfiles
  for (const sp of data.styleProfile) {
    await prisma.styleProfile.upsert({
      where: { id: sp.id },
      create: sp,
      update: sp,
    });
  }
  logger.info("[restore] StyleProfiles restored:", data.styleProfile.length);

  // 7. Restore StyleBindings
  for (const sb of data.styleBinding) {
    await prisma.styleBinding.upsert({
      where: { id: sb.id },
      create: sb,
      update: sb,
    });
  }
  logger.info("[restore] StyleBindings restored:", data.styleBinding.length);

  // 8. Restore AntiAiRules (BEFORE StyleProfileAntiAiRules due to FK)
  // Delete existing seed data first, then insert with original IDs from backup
  await prisma.styleProfileAntiAiRule.deleteMany();
  await prisma.antiAiRule.deleteMany();
  for (const rule of data.antiAiRule) {
    await prisma.antiAiRule.create({ data: rule });
  }
  logger.info("[restore] AntiAiRules restored:", data.antiAiRule.length);

  // 9. Restore StyleProfileAntiAiRules (references both StyleProfile and AntiAiRule)
  for (const rule of data.styleProfileAntiAiRule) {
    await prisma.styleProfileAntiAiRule.upsert({
      where: { id: rule.id },
      create: rule,
      update: rule,
    });
  }
  logger.info("[restore] StyleProfileAntiAiRules restored:", data.styleProfileAntiAiRule.length);

  // 10. Restore KnowledgeDocuments (set activeVersionId to null since backup lacks KnowledgeDocumentVersion)
  for (const kd of data.knowledgeDocument) {
    const { activeVersionId, ...rest } = kd;
    await prisma.knowledgeDocument.upsert({
      where: { id: kd.id },
      create: { ...rest, activeVersionId: null },
      update: { ...rest, activeVersionId: null },
    });
  }
  logger.info("[restore] KnowledgeDocuments restored:", data.knowledgeDocument.length);

  logger.info("[restore] ✅ Database restore complete!");
}

main()
  .catch((error) => {
    logger.error("[restore] ❌ Restore failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
