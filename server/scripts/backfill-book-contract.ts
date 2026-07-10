/**
 * Script: backfill-book-contract.ts
 * Purpose: 生成并写入 BookContract（绕过接管验证的鸡和蛋死锁）
 * Usage:   cd server && npx tsx scripts/backfill-book-contract.ts
 *
 * 背景：步骤2的"生成故事引擎"只跑了 StoryMacroAssetPhase，
 * BookContract 没有被生成，导致 AI 导演接管验证失败。
 * 此脚本调用 runDirectorBookContractPhase 补齐缺失的 BookContract。
 */

import { NovelDirectorService } from "../src/services/novel/director/NovelDirectorService";
import { BookContractService } from "../src/services/novel/BookContractService";
import { StoryMacroPlanService } from "../src/services/novel/storyMacro/StoryMacroPlanService";
import { runDirectorBookContractPhase } from "../src/services/novel/director/phases/novelDirectorStoryMacroPhase";
import { prisma } from "../src/db/prisma";
import type { DirectorConfirmRequest, StoryMacroPlan } from "@ai-novel/shared";

const NOVEL_ID = "cmrc3xxyc0001c0463z8qhdgq";
const TASK_ID = "backfill_book_contract_task"; // 占位 taskId（不会写入实际任务）

async function main() {
  console.log("1. 加载小说数据...");
  const novel = await prisma.novel.findUnique({
    where: { id: NOVEL_ID },
    select: {
      id: true,
      title: true,
      description: true,
      targetAudience: true,
      bookSellingPoint: true,
      competingFeel: true,
      first30ChapterPromise: true,
      commercialTagsJson: true,
      styleTone: true,
      estimatedChapterCount: true,
      genreId: true,
      primaryStoryModeId: true,
      secondaryStoryModeId: true,
      worldId: true,
      writingMode: true,
      projectMode: true,
      narrativePov: true,
      pacePreference: true,
      emotionIntensity: true,
      aiFreedom: true,
      postGenerationStyleReviewEnabled: true,
      defaultChapterLength: true,
      projectStatus: true,
      storylineStatus: true,
      outlineStatus: true,
      resourceReadyScore: true,
      sourceNovelId: true,
      sourceKnowledgeDocumentId: true,
      continuationBookAnalysisId: true,
      continuationBookAnalysisSections: true,
    },
  });
  if (!novel) throw new Error("小说不存在");

  const storyMacroPlanRow = await prisma.storyMacroPlan.findUnique({ where: { novelId: NOVEL_ID } });
  if (!storyMacroPlanRow) throw new Error("StoryMacroPlan 不存在，请先在步骤2生成故事引擎");

  const existingBookContract = await prisma.bookContract.findUnique({ where: { novelId: NOVEL_ID } });
  if (existingBookContract) {
    console.log("BookContract 已存在，无需修复。");
    process.exit(0);
  }

  console.log("2. 构建 DirectorConfirmRequest...");
  const storyMacroService = new StoryMacroPlanService();
  const bookContractService = new BookContractService();

  // 从 Novel 原始数据构建 DirectorConfirmRequest（与 takeover 逻辑一致）
  const rawNovel = novel as Record<string, unknown>;
  const commercialTags: string[] = (() => {
    try {
      const raw = novel.commercialTagsJson;
      if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
      }
    } catch { /* */ }
    return [];
  })();

  const directorInput: DirectorConfirmRequest = {
    title: novel.title,
    description: novel.description ?? undefined,
    targetAudience: novel.targetAudience ?? undefined,
    bookSellingPoint: novel.bookSellingPoint ?? undefined,
    competingFeel: novel.competingFeel ?? undefined,
    first30ChapterPromise: novel.first30ChapterPromise ?? undefined,
    commercialTags: commercialTags.length > 0 ? commercialTags : undefined,
    genreId: novel.genreId ?? undefined,
    primaryStoryModeId: novel.primaryStoryModeId ?? undefined,
    secondaryStoryModeId: novel.secondaryStoryModeId ?? undefined,
    worldId: novel.worldId ?? undefined,
    writingMode: (novel as any).writingMode ?? "original",
    projectMode: (novel as any).projectMode ?? undefined,
    narrativePov: (novel as any).narrativePov ?? undefined,
    pacePreference: (novel as any).pacePreference ?? undefined,
    styleTone: novel.styleTone ?? undefined,
    emotionIntensity: (novel as any).emotionIntensity ?? undefined,
    aiFreedom: (novel as any).aiFreedom ?? undefined,
    postGenerationStyleReviewEnabled: (novel as any).postGenerationStyleReviewEnabled ?? true,
    defaultChapterLength: (novel as any).defaultChapterLength ?? undefined,
    estimatedChapterCount: novel.estimatedChapterCount ?? undefined,
    projectStatus: (novel as any).projectStatus ?? undefined,
    storylineStatus: (novel as any).storylineStatus ?? undefined,
    outlineStatus: (novel as any).outlineStatus ?? undefined,
    resourceReadyScore: (novel as any).resourceReadyScore ?? undefined,
    sourceNovelId: (novel as any).sourceNovelId ?? undefined,
    sourceKnowledgeDocumentId: (novel as any).sourceKnowledgeDocumentId ?? undefined,
    continuationBookAnalysisId: (novel as any).continuationBookAnalysisId ?? undefined,
    continuationBookAnalysisSections: (novel as any).continuationBookAnalysisSections ?? undefined,
    idea: novel.description ?? novel.title,
    candidate: {
      id: `takeover-${novel.id}`,
      workingTitle: novel.title,
      logline: novel.description?.trim() ?? "",
      positioning: novel.targetAudience?.trim() ?? "",
      sellingPoint: novel.bookSellingPoint?.trim() ?? "",
      coreConflict: novel.description?.trim() ?? "",
      protagonistPath: "",
      endingDirection: "",
      hookStrategy: novel.first30ChapterPromise?.trim() ?? "",
      progressionLoop: "",
      whyItFits: "沿用当前项目已保存的书级信息",
      toneKeywords: (novel.styleTone?.split(/[，、]/) ?? []).filter(Boolean),
      targetChapterCount: novel.estimatedChapterCount ?? 80,
    },
  };

  console.log("3. 加载 StoryMacroPlan...");
  const storyMacroPlan: StoryMacroPlan | null = await storyMacroService.getPlan(NOVEL_ID);
  if (!storyMacroPlan) throw new Error("无法加载 StoryMacroPlan");

  console.log("4. 生成 BookContract（调 LLM，可能需要几秒）...");
  try {
    await runDirectorBookContractPhase({
      taskId: TASK_ID,
      novelId: NOVEL_ID,
      request: directorInput,
      storyMacroPlan,
      dependencies: {
        storyMacroService,
        bookContractService,
      },
      callbacks: {
        markDirectorTaskRunning: async () => {},
      },
    });
  } catch (error) {
    console.error("生成 BookContract 失败:", error);
    process.exit(1);
  }

  console.log("5. 验证...");
  const contract = await bookContractService.getByNovelId(NOVEL_ID);
  if (contract) {
    console.log("✅ BookContract 已成功写入！");
    console.log(`   - readingPromise: ${contract.readingPromise.substring(0, 60)}...`);
    console.log(`   - coreSellingPoint: ${contract.coreSellingPoint.substring(0, 60)}...`);
  } else {
    console.error("❌ BookContract 写入后仍为空，请检查日志。");
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
