/**
 * 从 temp/db-backup.json 恢复用户数据
 * 在 prisma migrate reset + seed 之后运行
 * 用法：node scripts/restore-user-data.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const RESTORE_TABLES = ['novel', 'world', 'character', 'chapter', 'characterRelation', 'knowledgeDocument'];

async function main() {
  const { prisma } = await import(resolve(projectRoot, 'server/dist/db/prisma.js'));

  const backupPath = resolve(projectRoot, 'temp/db-backup.json');
  const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));

  console.log('📦 备份概览:');
  for (const [table, rows] of Object.entries(backup)) {
    console.log(`  ${table}: ${rows.length} 行`);
  }
  console.log('');

  const seededAntiAi = await prisma.antiAiRule.count();
  const seededProfiles = await prisma.styleProfile.count();
  console.log(`🔍 Seed 后: antiAiRule=${seededAntiAi}, styleProfile=${seededProfiles}`);
  console.log('');

  // 1. 恢复用户自定义反 AI 规则
  if (backup.antiAiRule) {
    const existingKeys = new Set(
      (await prisma.antiAiRule.findMany({ select: { key: true } })).map(r => r.key)
    );
    let n = 0;
    for (const rule of backup.antiAiRule) {
      if (existingKeys.has(rule.key)) continue;
      try {
        const { createdAt, updatedAt, ...data } = rule;
        await prisma.antiAiRule.create({ data });
        n++;
      } catch (e) { console.log(`  ⚠️ antiAiRule ${rule.key}: ${e.message.substring(0, 80)}`); }
    }
    console.log(`✅ antiAiRule: +${n} 用户自定义`);
  }

  // 2. 恢复用户自定义风格画像
  if (backup.styleProfile) {
    const existingIds = new Set(
      (await prisma.styleProfile.findMany({ select: { id: true } })).map(r => r.id)
    );
    let n = 0;
    for (const p of backup.styleProfile) {
      if (existingIds.has(p.id)) continue;
      try {
        const { createdAt, updatedAt, ...data } = p;
        await prisma.styleProfile.create({ data });
        n++;
      } catch (e) { console.log(`  ⚠️ styleProfile ${p.id}: ${e.message.substring(0, 80)}`); }
    }
    console.log(`✅ styleProfile: +${n} 用户自定义`);
  }

  // 3. 恢复风格绑定
  if (backup.styleBinding) {
    let n = 0;
    for (const b of backup.styleBinding) {
      try {
        const { createdAt, updatedAt, ...data } = b;
        await prisma.styleBinding.upsert({ where: { id: b.id }, create: data, update: data });
        n++;
      } catch (e) { console.log(`  ⚠️ styleBinding ${b.id}: ${e.message.substring(0, 80)}`); }
    }
    console.log(`✅ styleBinding: +${n}`);
  }

  // 4. 恢复用户数据
  let total = 0;
  for (const table of RESTORE_TABLES) {
    const rows = backup[table];
    if (!rows || rows.length === 0) { console.log(`⏭️ ${table}: 空`); continue; }

    let n = 0;
    for (const row of rows) {
      try {
        const { id, ...data } = row;
        await prisma[table].upsert({ where: { id }, create: { id, ...data }, update: data });
        n++;
      } catch (e) { console.log(`  ⚠️ ${table} ${row.id}: ${e.message.substring(0, 80)}`); }
    }
    console.log(`✅ ${table}: ${n}/${rows.length}`);
    total += n;
  }

  console.log(`\n📊 恢复完成: 共 ${total} 行`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌ 恢复失败:', e.message); process.exit(1); });
