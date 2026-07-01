/**
 * 批量迁移 console.* 到 LoggerService 的脚本
 * 用法: node scripts/migrate-console-to-logger.cjs
 */

const fs = require('fs');
const path = require('path');

const SERVER_SRC = path.join(__dirname, '../server/src');

// 排除的目录（迁移脚本是一次性的，不迁移）
const EXCLUDE_DIRS = [
  'prisma/migrations-data',
  'node_modules',
];

// 排除的文件
const EXCLUDE_FILES = [
  'LoggerService.ts', // LoggerService 本身
];

// 替换规则
const REPLACEMENTS = [
  { from: /console\.log\(/g, to: 'logger.info(' },
  { from: /console\.warn\(/g, to: 'logger.warn(' },
  { from: /console\.error\(/g, to: 'logger.error(' },
  { from: /console\.info\(/g, to: 'logger.info(' },
  { from: /console\.debug\(/g, to: 'logger.debug(' },
];

// logger 导入语句
const LOGGER_IMPORT = `import { logger } from "../services/logging/LoggerService";`;

function shouldExclude(filePath) {
  const relativePath = path.relative(SERVER_SRC, filePath);
  
  // 检查排除目录
  for (const dir of EXCLUDE_DIRS) {
    if (relativePath.startsWith(dir)) {
      return true;
    }
  }
  
  // 检查排除文件
  for (const file of EXCLUDE_FILES) {
    if (relativePath.endsWith(file)) {
      return true;
    }
  }
  
  return false;
}

function getRelativeImportPath(fromFile) {
  const fromDir = path.dirname(fromFile);
  const toFile = path.join(SERVER_SRC, 'services/logging/LoggerService');
  let relativePath = path.relative(fromDir, toFile).replace(/\\/g, '/');
  
  // 确保以 ./ 或 ../ 开头
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return `import { logger } from "${relativePath}";`;
}

function processFile(filePath) {
  if (shouldExclude(filePath)) {
    return { skipped: true };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacements = 0;
  
  // 检查是否包含 console.*
  const hasConsole = REPLACEMENTS.some(r => r.from.test(content));
  if (!hasConsole) {
    return { skipped: true };
  }
  
  // 重置正则 lastIndex
  REPLACEMENTS.forEach(r => r.from.lastIndex = 0);
  
  // 执行替换
  for (const { from, to } of REPLACEMENTS) {
    const matches = content.match(from);
    if (matches) {
      replacements += matches.length;
      content = content.replace(from, to);
      modified = true;
    }
  }
  
  if (modified) {
    // 检查是否已有 logger 导入
    const hasLoggerImport = content.includes('from "../services/logging/LoggerService"') ||
                           content.includes("from '../services/logging/LoggerService'");
    
    // 添加 logger 导入（如果没有）
    if (!hasLoggerImport) {
      const importStatement = getRelativeImportPath(filePath);
      
      // 在最后一个 import 语句后添加
      const lastImportIndex = content.lastIndexOf('\nimport ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex + 1);
        content = content.slice(0, endOfLine + 1) + importStatement + '\n' + content.slice(endOfLine + 1);
      } else {
        // 如果没有 import，在文件开头添加
        content = importStatement + '\n\n' + content;
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return { modified, replacements };
}

function walkDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      results.push(filePath);
    }
  }
  
  return results;
}

// 主逻辑
console.log('=== Console → Logger 迁移脚本 ===\n');
console.log(`扫描目录: ${SERVER_SRC}\n`);

const files = walkDir(SERVER_SRC);
let totalModified = 0;
let totalReplacements = 0;
let totalSkipped = 0;

for (const file of files) {
  const result = processFile(file);
  
  if (result.skipped) {
    totalSkipped++;
  } else if (result.modified) {
    totalModified++;
    totalReplacements += result.replacements;
    const relativePath = path.relative(SERVER_SRC, file);
    console.log(`✓ ${relativePath} (${result.replacements} 处替换)`);
  }
}

console.log('\n=== 迁移完成 ===');
console.log(`扫描文件: ${files.length}`);
console.log(`修改文件: ${totalModified}`);
console.log(`替换总数: ${totalReplacements}`);
console.log(`跳过文件: ${totalSkipped}`);
