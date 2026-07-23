/**
 * 文件系统 → 数据库 全量同步脚本
 *
 * 用法：node scripts/sync-file-to-db.js [--update]
 *
 * 默认模式（missing_only）：只创建数据库中不存在的新条目
 * --update 模式（sync_existing）：同时更新已存在的条目
 *
 * 同步范围：antiAiRules / writingTechniques / vocabularyRules / atmosphereCards
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

async function main() {
  const mode = process.argv.includes('--update') ? 'sync_existing' : 'missing_only';

  console.log(`🔄 文件系统 → 数据库同步（模式: ${mode}）\n`);

  // 动态导入已构建的服务端模块（Windows 需要 file:// URL）
  const { syncAllFromFileSystem } = await import(
    pathToFileURL(resolve(projectRoot, 'server/dist/services/styleEngine/FileToDbSyncService.js')).href
  );
  const { prisma } = await import(
    pathToFileURL(resolve(projectRoot, 'server/dist/db/prisma.js')).href
  );

  try {
    const result = await syncAllFromFileSystem(mode);

    console.log('📊 同步结果:\n');

    for (const [category, data] of Object.entries(result)) {
      const { created, updated, skipped, errors } = data;
      console.log(`  ${category}:`);
      console.log(`    ✅ 新建: ${created}`);
      if (updated > 0) console.log(`    🔄 更新: ${updated}`);
      if (skipped > 0) console.log(`    ⏭️  跳过: ${skipped}`);
      if (errors.length > 0) {
        console.log(`    ❌ 错误: ${errors.length}`);
        for (const err of errors) {
          console.log(`       - ${err}`);
        }
      }
      console.log();
    }

    const totalCreated = Object.values(result).reduce((s, d) => s + d.created, 0);
    const totalErrors = Object.values(result).reduce((s, d) => s + d.errors.length, 0);
    console.log(`✅ 完成：共 ${totalCreated} 条新建，${totalErrors} 个错误`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ 同步脚本失败:', err);
  process.exit(1);
});
