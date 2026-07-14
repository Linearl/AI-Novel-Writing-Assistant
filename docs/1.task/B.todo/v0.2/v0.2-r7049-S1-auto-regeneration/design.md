---
description: "REQ-7049: 自动重新生成 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7049: 自动重新生成 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/services/novel/` 下新增重试管理服务，监听质量检查事件，自动触发重新生成。

```
事件流：
章节生成完成
  ↓
QualityCheckService.run(chapterId)  // REQ-7048
  ↓
质量合格 ────→ 流程结束，章节生效
质量不合格 ↓
  ↓
★ ChapterRegenerationManager.retry(chapterId, report)  // 新增
  ↓
┌────────────────────────────────────┐
│  retryAttempts < maxRetries ?      │
│    YES → 调整参数 → 重新生成      │
│    NO  → 保留最佳 → 通知用户      │
└────────────────────────────────────┘
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/novel/regeneration/ChapterRegenerationManager.ts

interface RegenerationConfig {
  maxRetries: number;           // 默认3
  parameterAdjustment: {
    temperatureStep: number;    // 每次温度增量，默认0.1
    maxTemperature: number;     // 最大温度，默认1.5
  };
  enabled: boolean;             // 默认true
  autoMode: boolean;            // true=自动重试，false=需用户确认
}

interface RegenerationAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  parameters: {
    temperature: number;
    promptVariant?: string;
  };
  qualityScore: number;
  success: boolean;
  error?: string;
}

interface RegenerationResult {
  chapterId: string;
  totalAttempts: number;
  finalSuccess: boolean;
  attempts: RegenerationAttempt[];
  bestAttempt?: RegenerationAttempt;
}

interface ChapterRegenerationLog {
  id: string;
  chapterId: string;
  totalAttempts: number;
  finalSuccess: boolean;
  bestQualityScore: number;
  attempts: string;  // JSON serialized RegenerationAttempt[]
  createdAt: string;
  completedAt?: string;
}
```

## 2. 详细设计

### 2.1 重试管理器

```typescript
// server/src/services/novel/regeneration/ChapterRegenerationManager.ts

export class ChapterRegenerationManager {
  private config: RegenerationConfig;

  constructor(config: RegenerationConfig) {
    this.config = config;
  }

  async retry(
    chapterId: string,
    qualityReport: QualityReport
  ): Promise<RegenerationResult> {
    const attempts: RegenerationAttempt[] = [];
    let bestAttempt: RegenerationAttempt | undefined;

    // 获取当前章节生成参数
    const originalParams = await this.getChapterParams(chapterId);

    for (let i = 0; i < this.config.maxRetries; i++) {
      const adjustedParams = this.adjustParameters(originalParams, i);

      const attempt: RegenerationAttempt = {
        attemptNumber: i + 1,
        startedAt: new Date().toISOString(),
        parameters: adjustedParams,
        qualityScore: 0,
        success: false,
      };

      try {
        // 执行重新生成
        const newContent = await this.regenerateChapter(chapterId, adjustedParams);

        // 重新检查质量
        const newReport = await this.checkQuality(chapterId, newContent);

        attempt.completedAt = new Date().toISOString();
        attempt.qualityScore = newReport.overallScore;
        attempt.success = newReport.passed;

        attempts.push(attempt);

        // 跟踪最佳结果
        if (!bestAttempt || attempt.qualityScore > bestAttempt.qualityScore) {
          bestAttempt = attempt;
        }

        // 成功则停止
        if (attempt.success) {
          break;
        }

        // 通知重试进度
        await this.notifyRetryProgress(chapterId, attempt);

      } catch (error) {
        attempt.completedAt = new Date().toISOString();
        attempt.error = error.message;
        attempts.push(attempt);
      }
    }

    // 应用最佳结果
    if (bestAttempt) {
      await this.applyBestAttempt(chapterId, bestAttempt);
    }

    // 保存重试日志
    const result: RegenerationResult = {
      chapterId,
      totalAttempts: attempts.length,
      finalSuccess: attempts.some(a => a.success),
      attempts,
      bestAttempt,
    };

    await this.saveRegenerationLog(result);
    await this.notifyCompletion(result);

    return result;
  }

  private adjustParameters(
    original: GenerationParams,
    attemptIndex: number
  ): GenerationParams {
    const tempIncrease = this.config.parameterAdjustment.temperatureStep * (attemptIndex + 1);
    const newTemperature = Math.min(
      original.temperature + tempIncrease,
      this.config.parameterAdjustment.maxTemperature
    );

    return {
      ...original,
      temperature: newTemperature,
    };
  }
}
```

### 2.2 事件集成

```typescript
// 监听质量检查完成事件

import { EventEmitter } from 'events';

// 在事件处理器中注册
qualityCheckEmitter.on('qualityCheck:completed', async (event) => {
  const { chapterId, report } = event;

  if (!report.passed && regenerationConfig.enabled) {
    // 异步触发重试（不阻塞当前流程）
    regenerationManager.retry(chapterId, report).catch(err => {
      logger.error('Regeneration failed', {
        chapterId,
        error: err.message,
      });
    });
  }
});
```

### 2.3 配置管理

```typescript
// server/src/services/novel/regeneration/config.ts

export const defaultRegenerationConfig: RegenerationConfig = {
  maxRetries: 3,
  parameterAdjustment: {
    temperatureStep: 0.1,
    maxTemperature: 1.5,
  },
  enabled: true,
  autoMode: true,
};

export async function getRegenerationConfig(): Promise<RegenerationConfig> {
  const stored = await prisma.systemConfig.findUnique({
    where: { key: 'regeneration' },
  });
  return stored
    ? { ...defaultRegenerationConfig, ...JSON.parse(stored.value) }
    : defaultRegenerationConfig;
}
```

## 3. 数据模型

### 3.1 数据库表

```sql
CREATE TABLE ChapterRegenerationLog (
  id TEXT PRIMARY KEY,
  chapterId TEXT NOT NULL,
  totalAttempts INTEGER NOT NULL,
  finalSuccess BOOLEAN NOT NULL,
  bestQualityScore REAL NOT NULL,
  attempts JSON NOT NULL,       -- RegenerationAttempt[]
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,

  FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
);

CREATE INDEX idx_regeneration_chapter ON ChapterRegenerationLog(chapterId);
```

### 3.2 日志格式

```typescript
interface RegenerationLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: {
    chapterId: string;
    attemptNumber: number;
    totalAttempts: number;
    qualityScore: number;
    parameters: GenerationParams;
    success: boolean;
  };
}
```

## 4. 接口设计

### 4.1 HTTP API

```typescript
// POST /api/novel/:novelId/chapters/:chapterId/regenerate
// 手动触发重新生成
Body: { reason?: string }
Response: RegenerationResult

// GET /api/novel/:novelId/chapters/:chapterId/regeneration-history
// 查询重试历史
Response: RegenerationLogEntry[]

// GET /api/novel/:novelId/regeneration/stats
// 查询整体重试统计
Response: {
  totalRetries: number;
  successRate: number;
  averageAttempts: number;
}
```

### 4.2 内部接口

```typescript
// 重试入口
export async function triggerRegeneration(
  chapterId: string,
  qualityReport: QualityReport
): Promise<RegenerationResult>;

// 手动重试
export async function manualRegeneration(
  chapterId: string,
  reason?: string
): Promise<RegenerationResult>;

// 获取重试配置
export async function getRegenerationConfig(): Promise<RegenerationConfig>;

// 更新重试配置
export async function updateRegenerationConfig(
  config: Partial<RegenerationConfig>
): Promise<void>;
```

## 5. 实现步骤

### Phase 1: 核心重试逻辑（0.25天）

1. 创建 `server/src/services/novel/regeneration/` 目录
2. 实现 `ChapterRegenerationManager` 主类
3. 实现参数调整逻辑
4. 创建数据库迁移（ChapterRegenerationLog 表）

### Phase 2: 事件集成（0.15天）

1. 集成质量检查事件监听器
2. 实现异步触发机制
3. 实现重试进度通知

### Phase 3: API 和配置（0.1天）

1. 实现 HTTP API
2. 实现配置管理
3. 集成到现有章节生成流程

### Phase 4: 测试（0.25天）

1. 单元测试：参数调整逻辑
2. 单元测试：重试流程
3. 集成测试：完整重试流程
4. 边界用例测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 无限重试 | 资源浪费 | 低 | 严格限制重试次数上限 |
| 重试结果覆盖原结果 | 最佳结果丢失 | 低 | 保留所有尝试，选择最佳 |
| 并发重试冲突 | 章节内容不一致 | 低 | 事务性更新 + 版本号控制 |
| 配置不当 | 重试行为异常 | 低 | 合理默认值 + 配置校验 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('ChapterRegenerationManager', () => {
  it('should retry with adjusted parameters', async () => {});
  it('should stop after successful retry', async () => {});
  it('should stop after max retries', async () => {});
  it('should apply best attempt result', async () => {});
});
```

### 7.2 集成测试

```typescript
describe('Regeneration flow', () => {
  it('should trigger regeneration on quality failure', async () => {});
  it('should not trigger regeneration on quality pass', async () => {});
  it('should save regeneration log', async () => {});
});
```

## 8. 交付物

- [ ] `server/src/services/novel/regeneration/ChapterRegenerationManager.ts`
- [ ] `server/src/services/novel/regeneration/config.ts`
- [ ] `server/src/events/handlers/regenerationHandler.ts`
- [ ] `server/prisma/migrations/` - 新增 ChapterRegenerationLog 迁移
- [ ] `server/tests/novel/regeneration/` - 测试文件
