/**
 * 历史数据回填脚本：根据 promptName 推断 LlmTokenUsage.stepType
 *
 * 用法：npx tsx scripts/data/backfill-step-type.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STEP_TYPE_RULES: Array<{ pattern: RegExp; stepType: string }> = [
  { pattern: /draft|generate|chapter/i, stepType: "draft" },
  { pattern: /repair|fix/i, stepType: "repair" },
  { pattern: /review|quality/i, stepType: "review" },
  { pattern: /outline/i, stepType: "outline" },
  { pattern: /plan/i, stepType: "planning" },
  { pattern: /style/i, stepType: "style" },
  { pattern: /character/i, stepType: "character" },
];

function inferStepType(promptName: string, metadataJson: unknown): string | null {
  // 优先从 metadataJson 的 stage/taskType 推断
  if (metadataJson && typeof metadataJson === "object") {
    const meta = metadataJson as Record<string, unknown>;
    const stage = typeof meta.stage === "string" ? meta.stage : "";
    const taskType = typeof meta.taskType === "string" ? meta.taskType : "";
    const combined = `${stage} ${taskType}`;
    for (const rule of STEP_TYPE_RULES) {
      if (rule.pattern.test(combined)) return rule.stepType;
    }
  }

  // 从 promptName 推断
  for (const rule of STEP_TYPE_RULES) {
    if (rule.pattern.test(promptName)) return rule.stepType;
  }

  return null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`[backfill-step-type] ${isDryRun ? "DRY RUN" : "EXECUTE"}`);

  // 查找所有 stepType 为 NULL 的记录
  const records = await prisma.llmTokenUsage.findMany({
    where: { stepType: null },
    select: { id: true, promptName: true, metadataJson: true },
  });

  console.log(`[backfill-step-type] 找到 ${records.length} 条待回填记录`);

  let inferred = 0;
  let skipped = 0;
  const updates: Array<{ id: string; stepType: string }> = [];

  for (const record of records) {
    const stepType = inferStepType(record.promptName, record.metadataJson);
    if (stepType) {
      updates.push({ id: record.id, stepType });
      inferred++;
    } else {
      skipped++;
    }
  }

  console.log(`[backfill-step-type] 可推断: ${inferred}, 无法推断: ${skipped}`);

  if (!isDryRun && updates.length > 0) {
    // 批量更新（每 100 条一批）
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((u) =>
          prisma.llmTokenUsage.update({
            where: { id: u.id },
            data: { stepType: u.stepType },
          }),
        ),
      );
      console.log(`[backfill-step-type] 已更新 ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
    }
    console.log("[backfill-step-type] 回填完成");
  } else if (isDryRun) {
    // 显示前 10 条预览
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.id} → ${u.stepType}`);
    }
    if (updates.length > 10) {
      console.log(`  ... 共 ${updates.length} 条`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[backfill-step-type] 执行失败:", err);
  process.exit(1);
});
