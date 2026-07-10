/**
 * 从 temp/db-backup.json 恢复用户数据
 * 在 prisma migrate reset + seed 之后运行
 *
 * 策略：
 * - 跳过 seed 已覆盖的表（antiAiRule, styleTemplate, styleProfile）
 * - 只恢复用户创建的数据（novel, chapter, character, world 等）
 * - 使用 upsert 避免冲突
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// 需要恢复的表（按依赖顺序）
const RESTORE_TABLES = [
  'novel',
  'world',
  'character',
  'chapter',
  'characterRelation',
  'knowledgeDocument',
];

// seed 已覆盖，不恢复的表
const SKIP_TABLES = [
  'antiAiRule',       // 从 YAML 文件 seed
  'styleTemplate',    // 从 defaults.ts seed
  'styleProfile',     // 从 defaults.ts seed
  'styleBinding',     // 依赖 styleProfile
  'styleProfileAntiAiRule', // 依赖 styleProfile + antiAiRule
];

async function main() {
  const { prisma } = await import(resolve(projectRoot, 'server/dist/db/prisma.js'));

  const backupPath = resolve(projectRoot, 'temp/db-backup.json');
  const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));

  console.log('📦 备份概览:');
  for (const [table, rows] of Object.entries(backup)) {
    console.log(`  ${table}: ${(rows as any[]).length} 行`);
  }
  console.log('');

  // 检查 seed 后的默认数据
  const seededAntiAi = await prisma.antiAiRule.count();
  const seededTemplates = await prisma.styleTemplate.count();
  const seededProfiles = await prisma.styleProfile.count();
  console.log(`🔍 Seed 后状态: antiAiRule=${seededAntiAi}, styleTemplate=${seededTemplates}, styleProfile=${seededProfiles}`);

  // 恢复用户自定义的反 AI 规则（seed 只创建默认的，用户自定义的需要恢复）
  if (backup.antiAiRule) {
    const existingKeys = new Set(
      (await prisma.antiAiRule.findMany({ select: { key: true } })).map(r => r.key)
    );
    let customRulesRestored = 0;
    for (const rule of backup.antiAiRule) {
      if (existingKeys.has(rule.key)) continue; // seed 已创建，跳过
      try {
        const { id, createdAt, updatedAt, ...data } = rule;
        await prisma.antiAiRule.create({ data: { id, ...data } });
        customRulesRestored++;
      } catch (err: any) {
        console.log(`  ⚠️  antiAiRule ${rule.key}: ${err.message.substring(0, 80)}`);
      }
    }
    console.log(`✅ antiAiRule: 恢复 ${customRulesRestored} 条用户自定义规则`);
  }

  // 恢复用户自定义的风格画像
  if (backup.styleProfile) {
    const existingIds = new Set(
      (await prisma.styleProfile.findMany({ select: { id: true } })).map(r => r.id)
    );
    let customProfilesRestored = 0;
    for (const profile of backup.styleProfile) {
      if (existingIds.has(profile.id)) continue;
      try {
        const { createdAt, updatedAt, ...data } = profile;
        await prisma.styleProfile.create({ data: { ...data } });
        customProfilesRestored++;
      } catch (err: any) {
        console.log(`  ⚠️  styleProfile ${profile.id}: ${err.message.substring(0, 80)}`);
      }
    }
    console.log(`✅ styleProfile: 恢复 ${customProfilesRestored} 条用户自定义画像`);
  }

  // 恢复风格绑定
  if (backup.styleBinding) {
    let bindingsRestored = 0;
    for (const binding of backup.styleBinding) {
      try {
        const { createdAt, updatedAt, ...data } = binding;
        await prisma.styleBinding.upsert({
          where: { id: binding.id },
          create: { ...data },
          update: data,
        });
        bindingsRestored++;
      } catch (err: any) {
        console.log(`  ⚠️  styleBinding ${binding.id}: ${err.message.substring(0, 80)}`);
      }
    }
    console.log(`✅ styleBinding: 恢复 ${bindingsRestored} 条`);
  }

  // 恢复用户数据（小说、章节等）
  let totalRestored = 0;
  for (const table of RESTORE_TABLES) {
    const rows = backup[table];
    if (!rows || rows.length === 0) {
      console.log(`⏭️  ${table}: 无数据，跳过`);
      continue;
    }

    let restored = 0;
    for (const row of rows) {
      try {
        // 提取 id，其余字段作为 data
        const { id, ...data } = row;
        // 清理 Prisma 内部字段
        for (const key of Object.keys(data)) {
          if (key.endsWith('Id') && typeof data[key] === 'string') continue;
          if (data[key] === null || data[key] === undefined) continue;
          if (typeof data[key] === 'string' || typeof data[key] === 'number' || typeof data[key] === 'boolean') continue;
          if (data[key] instanceof Array) continue;
          if (typeof data[key] === 'object') {
            // JSON 字段保持原样
          }
        }

        await prisma[table].upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
        restored++;
      } catch (err: any) {
        console.log(`  ⚠️  ${table} ${row.id}: ${err.message.substring(0, 80)}`);
      }
    }
    console.log(`✅ ${table}: 恢复 ${restored}/${rows.length}`);
    totalRestored += restored;
  }

  console.log(`\n📊 恢复完成: 共 ${totalRestored} 行`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('恢复失败:', err.message);
  process.exit(1);
});
