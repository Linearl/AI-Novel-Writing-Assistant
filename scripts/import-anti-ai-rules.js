/**
 * 反 AI 规则批量导入脚本
 *
 * 用法：node scripts/import-anti-ai-rules.js
 *
 * 从 temp/anti-ai-rules-import.json 读取新规则，
 * 通过 AntiAiRuleService.createRule() 导入数据库。
 * 已存在的规则（按 key 去重）会跳过。
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

async function main() {
  // 动态导入项目模块（需要先 build server）
  const { AntiAiRuleService } = await import(
    resolve(projectRoot, 'server/dist/services/styleEngine/AntiAiRuleService.js')
  );
  const { prisma } = await import(
    resolve(projectRoot, 'server/dist/db/prisma.js')
  );

  const rulesPath = resolve(projectRoot, 'temp/anti-ai-rules-import.json');
  const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

  console.log(`📦 准备导入 ${rules.length} 条反 AI 规则...\n`);

  // 获取已有规则 key 列表
  const existing = await prisma.antiAiRule.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map(r => r.key));

  const service = new AntiAiRuleService();
  let created = 0;
  let skipped = 0;

  for (const rule of rules) {
    if (existingKeys.has(rule.key)) {
      console.log(`⏭️  跳过（已存在）: ${rule.key}`);
      skipped++;
      continue;
    }

    try {
      await service.createRule({
        key: rule.key,
        name: rule.name,
        type: rule.type,
        severity: rule.severity,
        description: rule.description,
        detectPatterns: rule.detectPatterns,
        rewriteSuggestion: rule.rewriteSuggestion,
        promptInstruction: rule.promptInstruction,
        autoRewrite: rule.autoRewrite,
        enabled: rule.enabled,
        globalBaselineEnabled: rule.globalBaselineEnabled,
      });
      console.log(`✅ 已创建: ${rule.key} — ${rule.name}`);
      created++;
    } catch (err) {
      console.error(`❌ 创建失败: ${rule.key}`, err.message);
    }
  }

  console.log(`\n📊 导入完成：${created} 条新建，${skipped} 条跳过`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('导入脚本失败:', err);
  process.exit(1);
});
