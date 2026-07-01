/**
 * 修复被迁移脚本破坏的文件
 * 问题：logger 导入被插入到多行 import 语句中间
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表（从 typecheck 错误中提取）
const FILES_TO_FIX = [
  'server/src/db/seed.ts',
  'server/src/events/sideEffects/NovelSideEffectWorker.ts',
  'server/src/llm/modelCatalog.ts',
  'server/src/prompting/core/promptRunnerTelemetry.ts',
  'server/src/services/image/ImageGenerationService.ts',
  'server/src/services/novel/chapterEditor/ChapterEditorWorkspaceService.ts',
  'server/src/services/novel/director/projections/directorProgressTracker.ts',
  'server/src/services/novel/runtime/ChapterContentFinalizationService.ts',
  'server/src/services/novel/runtime/ChapterQualityGateService.ts',
  'server/src/services/novel/runtime/ChapterRuntimeCoordinator.ts',
  'server/src/services/novel/runtime/ChapterStreamGenerationOrchestrator.ts',
  'server/src/services/novel/volume/volumeGenerationOrchestrator.ts',
  'server/src/services/styleEngine/StyleDetectionService.ts',
  'server/src/services/styleEngine/StyleProfileLlmService.ts',
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 匹配被破坏的模式：import {\nimport { logger } from "...";
  // 修复为正确的多行 import
  const brokenPattern = /import \{\s*\nimport \{ logger \} from "([^"]+)";\s*\n/g;
  
  let fixed = false;
  content = content.replace(brokenPattern, (match, loggerPath) => {
    fixed = true;
    // 将 logger 导入移到前面
    return `import { logger } from "${loggerPath}";\nimport {\n`;
  });
  
  if (fixed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }
  
  console.log(`- No fix needed: ${filePath}`);
  return false;
}

console.log('=== 修复被破坏的文件 ===\n');

let fixedCount = 0;
for (const file of FILES_TO_FIX) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    if (fixFile(filePath)) {
      fixedCount++;
    }
  } else {
    console.log(`! File not found: ${file}`);
  }
}

console.log(`\n=== 修复完成 ===`);
console.log(`修复文件数: ${fixedCount}`);
