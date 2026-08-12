#!/usr/bin/env node

/**
 * clean-dev-db.js — 清理开发数据库，生成干净的种子数据库
 *
 * 用法：
 *   node scripts/dev/clean-dev-db.cjs [input] [output]
 *
 * 参数：
 *   input  - 源数据库路径（默认：server/dev.db）
 *   output - 输出路径（默认：desktop/build/app/dist/seed-dev.db）
 *
 * 说明：
 *   - 复制原始数据库到临时位置
 *   - 清空用户数据表（137张），保留产品预设表（3张）
 *   - 原始数据库不被修改
 */

const fs = require("node:fs");
const path = require("node:path");

// 需要保留的表（产品预设 + 系统表）
const TABLES_TO_KEEP = new Set([
  "AntiAiRule",        // AI 检测规则预设（28条）
  "WritingTechnique",  // 写作技法预设（98条）
  "StyleTemplate",     // 风格模板预设（8条）
  "_prisma_migrations", // 迁移记录（系统表）
  "sqlite_sequence",   // SQLite 系统表
]);

// 默认路径
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_INPUT = path.join(REPO_ROOT, "server", "dev.db");
const DEFAULT_OUTPUT = path.join(REPO_ROOT, "desktop", "build", "app", "dist", "seed-dev.db");

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] ? path.resolve(args[0]) : DEFAULT_INPUT;
  const outputPath = args[1] ? path.resolve(args[1]) : DEFAULT_OUTPUT;

  // 检查输入文件
  if (!fs.existsSync(inputPath)) {
    console.error(`[clean-dev-db] 错误：输入数据库不存在: ${inputPath}`);
    process.exit(1);
  }

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`[clean-dev-db] 源数据库: ${inputPath}`);
  console.log(`[clean-dev-db] 输出路径: ${outputPath}`);

  // 复制到临时位置
  const tempPath = `${outputPath}.__tmp__`;
  try {
    fs.copyFileSync(inputPath, tempPath);
    console.log(`[clean-dev-db] 已复制到临时位置: ${tempPath}`);
  } catch (err) {
    console.error(`[clean-dev-db] 复制失败:`, err.message);
    process.exit(1);
  }

  // 动态加载 better-sqlite3
  let Database;
  const possiblePaths = [
    "better-sqlite3",
    path.join(REPO_ROOT, "node_modules", "better-sqlite3"),
    path.join(REPO_ROOT, "node_modules", ".pnpm", "better-sqlite3@12.6.2", "node_modules", "better-sqlite3"),
  ];

  for (const reqPath of possiblePaths) {
    try {
      Database = require(reqPath);
      break;
    } catch {
      // 继续尝试下一个路径
    }
  }

  if (!Database) {
    console.error("[clean-dev-db] 错误：无法加载 better-sqlite3，请确保已安装");
    console.error("[clean-dev-db] 尝试的路径:", possiblePaths);
    fs.unlinkSync(tempPath);
    process.exit(1);
  }

  let db;
  try {
    db = new Database(tempPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = OFF"); // 临时关闭外键约束

    // 获取所有用户表
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map((row) => row.name);

    console.log(`[clean-dev-db] 共发现 ${tables.length} 张表`);

    // 分类统计
    const toClean = tables.filter((t) => !TABLES_TO_KEEP.has(t));
    const toKeep = tables.filter((t) => TABLES_TO_KEEP.has(t));

    console.log(`[clean-dev-db] 需清空: ${toClean.length} 张表`);
    console.log(`[clean-dev-db] 需保留: ${toKeep.length} 张表 (${toKeep.join(", ")})`);

    // 执行清理
    let totalDeleted = 0;

    const transaction = db.transaction(() => {
      for (const table of toClean) {
        try {
          // 注意：表名不能参数化，必须直接拼接（已通过白名单过滤）
          const before = db.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get()?.cnt ?? 0;
          db.prepare(`DELETE FROM "${table}"`).run();
          totalDeleted += before;
          if (before > 0) {
            console.log(`[clean-dev-db]   ${table}: 删除 ${before} 行`);
          }
        } catch (err) {
          console.warn(`[clean-dev-db]   ${table}: 清理失败 - ${err.message}`);
        }
      }
    });

    transaction();

    console.log(`[clean-dev-db] 总计删除 ${totalDeleted} 行数据`);

    // 优化数据库
    db.pragma("wal_checkpoint(TRUNCATE)");
    // 收缩文件空洞（删除行后数据库文件大小不会自动缩小；不 VACUUM 会导致
    // 本地 dev.db 清理出的 seed 与 CI migrate deploy 生成的 seed 大小差异巨大）
    db.exec("VACUUM");
    db.close();

    // 移动到最终位置
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    fs.renameSync(tempPath, outputPath);

    console.log(`[clean-dev-db] ✅ 清理完成: ${outputPath}`);

    // 验证输出
    const verifyDb = new Database(outputPath);
    const verifyTables = verifyDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();
    const verifyCounts = {};
    for (const { name } of verifyTables) {
      try {
        verifyCounts[name] = verifyDb.prepare(`SELECT COUNT(*) as cnt FROM "${name}"`).get().cnt;
      } catch {
        verifyCounts[name] = "error";
      }
    }
    verifyDb.close();

    console.log("[clean-dev-db] 验证结果:");
    for (const [table, count] of Object.entries(verifyCounts)) {
      if (TABLES_TO_KEEP.has(table)) {
        console.log(`[clean-dev-db]   ${table}: ${count} 行 (保留)`);
      } else if (count > 0) {
        console.warn(`[clean-dev-db]   ${table}: ${count} 行 (应为0!)`);
      }
    }

  } catch (err) {
    console.error("[clean-dev-db] 清理过程出错:", err);
    if (db) {
      try { db.close(); } catch { /* ignore */ }
    }
    // 清理临时文件
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    process.exit(1);
  }
}

main();
