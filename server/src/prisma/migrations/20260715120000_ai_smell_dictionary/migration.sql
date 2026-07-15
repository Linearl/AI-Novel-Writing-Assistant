-- REQ-7050: AI味自动检测 — AiSmellDictionary 表
-- 存储AI味检测词汇库，支持运行时动态更新

-- 1. 创建 AiSmellDictionary 表
CREATE TABLE "AiSmellDictionary" (
  "id" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL,          -- 'vocabulary' | 'emotion' | 'inner_thought'
  "word" TEXT NOT NULL,              -- 检测词汇
  "severity" INTEGER NOT NULL DEFAULT 1,  -- 1=warning, 2=error
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建分类索引
CREATE INDEX "AiSmellDictionary_category_idx" ON "AiSmellDictionary"("category");

-- 3. 添加唯一约束（同类别下词汇唯一）
CREATE UNIQUE INDEX "AiSmellDictionary_category_word_key" ON "AiSmellDictionary"("category", "word");
