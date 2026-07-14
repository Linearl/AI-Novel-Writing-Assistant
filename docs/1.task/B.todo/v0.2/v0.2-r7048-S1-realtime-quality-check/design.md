---
description: "REQ-7048: 实时质量检查器 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7048: 实时质量检查器 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/services/novel/` 下新增质量检查服务模块，章节生成完成后异步触发质量检查。

```
调用链路：
章节生成完成
  ↓
★ ChapterQualityChecker.run(chapterId)  // 异步质量检查（新增）
  ↓
┌─────────────────────────────────────┐
│  WordCountChecker     → 字数检查    │
│  StructureChecker     → 结构检查    │
│  CharacterChecker     → 人物检查    │
│  PlotCoherenceChecker → 情节检查    │
│  AiSmellChecker       → AI味检查    │
└─────────────────────────────────────┘
  ↓
QualityReport（JSON）→ 存储到数据库
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/novel/quality/ChapterQualityChecker.ts

interface QualityCheckConfig {
  wordCount: { min: number; max: number };
  structure: { minParagraphs: number; maxDialogueRatio: number };
  aiSmell: { threshold: number };
  enabledCheckers: string[];
}

interface QualityDimension {
  name: string;
  score: number;       // 0-100
  passed: boolean;
  issues: QualityIssue[];
}

interface QualityIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: { paragraph: number; offset: number };
}

interface QualityReport {
  chapterId: string;
  overallScore: number;
  passed: boolean;
  dimensions: QualityDimension[];
  summary: string;
  checkedAt: string;
}
```

## 2. 详细设计

### 2.1 字数检查器

```typescript
// server/src/services/novel/quality/checkers/WordCountChecker.ts

class WordCountChecker implements QualityDimensionChecker {
  name = 'wordCount';

  check(content: string, config: QualityCheckConfig): QualityDimension {
    const count = this.countEffectiveWords(content);
    const { min, max } = config.wordCount;
    const issues: QualityIssue[] = [];

    if (count < min) {
      issues.push({
        type: 'word_count_under',
        message: `字数不足：当前 ${count} 字，要求至少 ${min} 字`,
        severity: 'warning'
      });
    }
    if (count > max) {
      issues.push({
        type: 'word_count_over',
        message: `字数超标：当前 ${count} 字，建议不超过 ${max} 字`,
        severity: 'warning'
      });
    }

    const score = this.calculateScore(count, min, max);
    return { name: this.name, score, passed: issues.length === 0, issues };
  }

  private countEffectiveWords(content: string): number {
    return content
      .split(/\n/)
      .filter(line => line.trim().length > 0)
      .join('')
      .replace(/[^一-龥a-zA-Z0-9]/g, '')
      .length;
  }
}
```

### 2.2 结构检查器

```typescript
// server/src/services/novel/quality/checkers/StructureChecker.ts

class StructureChecker implements QualityDimensionChecker {
  name = 'structure';

  check(content: string, config: QualityCheckConfig): QualityDimension {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    const issues: QualityIssue[] = [];

    // 段落数量检查
    if (paragraphs.length < config.structure.minParagraphs) {
      issues.push({
        type: 'few_paragraphs',
        message: `段落数过少：${paragraphs.length} 段，建议至少 ${config.structure.minParagraphs} 段`,
        severity: 'warning'
      });
    }

    // 对话分布检查
    const dialogueParagraphs = paragraphs.filter(p =>
      /["「『"']/.test(p) && /["」』"']/.test(p)
    );
    const dialogueRatio = dialogueParagraphs.length / paragraphs.length;

    if (dialogueRatio > config.structure.maxDialogueRatio) {
      issues.push({
        type: 'too_much_dialogue',
        message: `对话比例过高：${(dialogueRatio * 100).toFixed(1)}%，建议不超过 ${(config.structure.maxDialogueRatio * 100).toFixed(0)}%`,
        severity: 'warning'
      });
    }

    if (dialogueRatio === 1.0) {
      issues.push({
        type: 'all_dialogue',
        message: '全篇均为对话，缺少叙述描写',
        severity: 'error'
      });
    }

    const score = this.calculateScore(paragraphs.length, dialogueRatio, config);
    return { name: this.name, score, passed: issues.length === 0, issues };
  }
}
```

### 2.3 人物检查器

```typescript
// server/src/services/novel/quality/checkers/CharacterChecker.ts

class CharacterChecker implements QualityDimensionChecker {
  name = 'character';

  async check(
    content: string,
    chapterId: string,
    config: QualityCheckConfig
  ): Promise<QualityDimension> {
    const issues: QualityIssue[] = [];

    // 从章节提取人物名称
    const extractedNames = this.extractCharacterNames(content);

    // 从人物设定库获取已定义人物
    const definedCharacters = await this.getDefinedCharacters(chapterId);

    // 检查未定义人物
    for (const name of extractedNames) {
      if (!definedCharacters.find(c => c.name === name || c.aliases?.includes(name))) {
        issues.push({
          type: 'undefined_character',
          message: `出现未定义人物：${name}`,
          severity: 'warning'
        });
      }
    }

    // 检查主要人物缺失
    const mainCharacters = definedCharacters.filter(c => c.isMain);
    for (const main of mainCharacters) {
      if (!extractedNames.includes(main.name)) {
        issues.push({
          type: 'main_character_absent',
          message: `主要人物 ${main.name} 未在本章出现`,
          severity: 'info'
        });
      }
    }

    const score = this.calculateScore(extractedNames, definedCharacters, issues);
    return { name: this.name, score, passed: issues.filter(i => i.severity === 'error').length === 0, issues };
  }

  private extractCharacterNames(content: string): string[] {
    // 基于中文人名模式提取（2-4字姓名）
    const namePattern = /(?:^|[，。！？\s])([一-龥]{2,4})(?:说|道|想|看|笑|问|答|点头|摇头|叹|哼)/g;
    const names = new Set<string>();
    let match;
    while ((match = namePattern.exec(content)) !== null) {
      names.add(match[1]);
    }
    return Array.from(names);
  }
}
```

### 2.4 情节连贯性检查器

```typescript
// server/src/services/novel/quality/checkers/PlotCoherenceChecker.ts

class PlotCoherenceChecker implements QualityDimensionChecker {
  name = 'plotCoherence';

  async check(
    content: string,
    chapterId: string,
    config: QualityCheckConfig
  ): Promise<QualityDimension> {
    const issues: QualityIssue[] = [];

    // 获取前一章内容
    const prevChapter = await this.getPreviousChapter(chapterId);

    if (prevChapter) {
      // 检查时间线跳跃
      const timeJump = this.detectTimeJump(prevChapter.content, content);
      if (timeJump) {
        issues.push({
          type: 'time_jump',
          message: `检测到时间跳跃：${timeJump.description}`,
          severity: 'warning'
        });
      }

      // 检查场景跳跃
      const sceneJump = this.detectSceneJump(prevChapter.content, content);
      if (sceneJump) {
        issues.push({
          type: 'scene_jump',
          message: `检测到场景跳跃：${sceneJump.description}`,
          severity: 'warning'
        });
      }
    }

    const score = this.calculateScore(issues, !!prevChapter);
    return { name: this.name, score, passed: issues.filter(i => i.severity === 'error').length === 0, issues };
  }
}
```

## 3. 数据模型

### 3.1 数据库表

```sql
CREATE TABLE ChapterQualityReport (
  id TEXT PRIMARY KEY,
  chapterId TEXT NOT NULL,
  overallScore REAL NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  dimensions JSON NOT NULL,      -- QualityDimension[]
  summary TEXT,
  checkedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
);

CREATE INDEX idx_quality_report_chapter ON ChapterQualityReport(chapterId);
CREATE INDEX idx_quality_report_score ON ChapterQualityReport(overallScore);
```

### 3.2 配置模型

```typescript
interface QualityCheckSystemConfig {
  wordCount: {
    min: number;          // 默认3000
    max: number;          // 默认8000
  };
  structure: {
    minParagraphs: number;       // 默认5
    maxDialogueRatio: number;    // 默认0.7
  };
  aiSmell: {
    enabled: boolean;            // 默认true
    threshold: number;           // 默认60分
  };
  plotCoherence: {
    enabled: boolean;            // 默认true
    timeJumpThreshold: number;   // 默认2（检测关键词密度）
  };
}
```

## 4. 接口设计

### 4.1 HTTP API

```typescript
// POST /api/novel/:novelId/chapters/:chapterId/quality
// 触发章节质量检查
Response: QualityReport

// GET /api/novel/:novelId/chapters/:chapterId/quality
// 查询章节质量报告
Response: QualityReport | null

// GET /api/novel/:novelId/quality/stats
// 查询小说整体质量统计
Response: {
  averageScore: number;
  passRate: number;
  dimensionAverages: Record<string, number>;
}
```

### 4.2 内部接口

```typescript
// 质量检查入口
export async function runQualityCheck(
  chapterId: string,
  config?: Partial<QualityCheckConfig>
): Promise<QualityReport>;

// 获取质量配置
export async function getQualityConfig(): Promise<QualityCheckConfig>;

// 更新质量配置
export async function updateQualityConfig(
  config: Partial<QualityCheckConfig>
): Promise<void>;
```

## 5. 实现步骤

### Phase 1: 核心框架（0.25天）

1. 创建 `server/src/services/novel/quality/` 目录
2. 实现 `QualityDimensionChecker` 接口
3. 实现 `ChapterQualityChecker` 主类
4. 创建数据库迁移（ChapterQualityReport 表）

### Phase 2: 检查器实现（0.25天）

1. 实现 `WordCountChecker`
2. 实现 `StructureChecker`
3. 实现 `CharacterChecker`
4. 实现 `PlotCoherenceChecker`
5. 集成 REQ-7050 的 AI味检测

### Phase 3: API 和集成（0.25天）

1. 实现质量检查 HTTP API
2. 集成到章节生成流程（异步触发）
3. 实现配置管理

### Phase 4: 测试（0.25天）

1. 单元测试：各检查器
2. 集成测试：完整检查流程
3. 边界用例测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 检查耗时过长 | 阻塞生成流程 | 中 | 异步执行 + 超时控制（5秒） |
| 人物提取不准 | 误报/漏报 | 中 | 可配置的命名规则 + 人物库交叉验证 |
| 情节分析不准 | 误判连贯性 | 高 | 基于关键词 + LLM辅助分析 |
| 配置不当 | 检查过于宽松或严格 | 低 | 合理默认值 + 可调配置 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('WordCountChecker', () => {
  it('should detect undercount chapters', () => {});
  it('should detect overcount chapters', () => {});
  it('should pass chapters within range', () => {});
});

describe('StructureChecker', () => {});
describe('CharacterChecker', () => {});
describe('PlotCoherenceChecker', () => {});
```

### 7.2 集成测试

```typescript
describe('ChapterQualityChecker', () => {
  it('should run all enabled checkers and produce report', () => {});
  it('should respect enabled/disabled config', () => {});
  it('should store report in database', () => {});
});
```

## 8. 交付物

- [ ] `server/src/services/novel/quality/ChapterQualityChecker.ts`
- [ ] `server/src/services/novel/quality/checkers/WordCountChecker.ts`
- [ ] `server/src/services/novel/quality/checkers/StructureChecker.ts`
- [ ] `server/src/services/novel/quality/checkers/CharacterChecker.ts`
- [ ] `server/src/services/novel/quality/checkers/PlotCoherenceChecker.ts`
- [ ] `server/src/modules/novel/quality/http/qualityRoutes.ts`
- [ ] `server/prisma/migrations/` - 新增 ChapterQualityReport 迁移
- [ ] `server/tests/novel/quality/` - 测试文件
