---
description: "REQ-2020 design: 自动导演流水线执行模式技术设计"
---

# REQ-2020: 自动导演流水线执行模式 - 技术设计

## 1. 架构概述

### 1.1 当前架构

```
用户触发自动导演
  ↓
结构化大纲阶段（批量细化）
  beat_sheet → chapter_list → chapter_detail_bundle（所有章节） → chapter_sync
  ↓
章节执行阶段（批量写作）
  第1章：写作 → 审校 → 修复 → 状态提交
  第2章：写作 → 审校 → 修复 → 状态提交
  ...
```

### 1.2 目标架构（流水线模式）

```
用户触发自动导演（pipelineMode = "pipeline"）
  ↓
结构化大纲阶段（细化 + 写作交错）
  beat_sheet → chapter_list → chapter_sync
  ↓
流水线执行阶段
  第1章细化完成 → 第1章写作 + 第2章细化
                   ↓
  第2章细化完成 → 第2章写作 + 第3章细化
                   ↓
  ...
```

---

## 2. 数据模型

### 2.1 自动导演状态扩展

```typescript
// shared/types/novelDirector.ts

export interface DirectorAutoExecutionState {
  // ... 现有字段
  
  // 新增：流水线模式
  pipelineMode: "batch" | "pipeline";
  
  // 新增：流水线状态
  pipelineState?: {
    refinementProgress: {
      total: number;
      completed: number;
      currentChapterId?: string;
    };
    writingProgress: {
      total: number;
      completed: number;
      currentChapterId?: string;
    };
    blockedChapterId?: string;
    blockingReason?: "quality_review" | "manual_approval";
  };
}
```

### 2.2 数据库表扩展

```sql
-- GenerationJob 表新增字段
ALTER TABLE GenerationJob ADD COLUMN pipelineMode VARCHAR(20) DEFAULT 'batch';
ALTER TABLE GenerationJob ADD COLUMN pipelineStateJson TEXT;
```

---

## 3. 核心组件设计

### 3.1 PipelineExecutionService（流水线执行服务）

**职责**：管理流水线模式下的章节执行

**关键方法**：

```typescript
class PipelineExecutionService {
  /**
   * 启动流水线执行
   */
  async startPipelineExecution(
    novelId: string,
    chapters: Chapter[],
    options: PipelineRunOptions
  ): Promise<void> {
    // 1. 初始化流水线状态
    // 2. 启动第一个章节的细化
    // 3. 监听细化完成事件
    // 4. 细化完成后启动写作
    // 5. 同时启动下一个章节的细化
  }
  
  /**
   * 处理章节细化完成
   */
  async handleChapterRefinementComplete(
    chapterId: string,
    novelId: string
  ): Promise<void> {
    // 1. 检查是否有阻塞（人工审核）
    // 2. 如果没有阻塞，启动该章节的写作
    // 3. 启动下一个章节的细化
  }
  
  /**
   * 处理章节写作完成
   */
  async handleChapterWritingComplete(
    chapterId: string,
    novelId: string,
    result: ChapterExecutionResult
  ): Promise<void> {
    // 1. 执行自动审校
    // 2. 如果审校未通过且需要人工审核
    //    - 阻塞后续写作
    //    - 发送通知
    // 3. 如果审校通过或不需要人工审核
    //    - 继续下一个章节的写作
  }
  
  /**
   * 恢复被阻塞的写作
   */
  async resumeBlockedWriting(
    chapterId: string,
    novelId: string
  ): Promise<void> {
    // 1. 清除阻塞状态
    // 2. 恢复后续章节的写作
  }
}
```

### 3.2 ChapterRefinementOrchestrator（章节细化编排器）

**职责**：管理章节细化的执行

**关键方法**：

```typescript
class ChapterRefinementOrchestrator {
  /**
   * 细化单个章节
   */
  async refineChapter(
    novelId: string,
    chapterId: string,
    options: RefinementOptions
  ): Promise<RefinementResult> {
    // 1. 调用 volumeService.generateVolumes 生成 task sheet
    // 2. 同步到执行区
    // 3. 返回细化结果
  }
  
  /**
   * 检查细化是否完成
   */
  isRefinementComplete(chapter: Chapter): boolean {
    return Boolean(chapter.taskSheet?.trim());
  }
}
```

### 3.3 QualityGateWithBlocking（带阻塞的质量门）

**职责**：处理审校结果，决定是否阻塞

**关键方法**：

```typescript
class QualityGateWithBlocking {
  /**
   * 处理审校结果
   */
  async handleReviewResult(
    chapterId: string,
    result: ReviewResult,
    config: QualityConfig
  ): Promise<QualityGateDecision> {
    // 1. 检查审校是否通过
    // 2. 检查是否需要人工审核
    // 3. 返回决策：继续、阻塞、跳过
  }
}

interface QualityGateDecision {
  action: "continue" | "block" | "skip";
  reason?: string;
  blockedChapterId?: string;
}
```

---

## 4. 流程设计

### 4.1 流水线启动流程

```
用户触发自动导演（pipelineMode = "pipeline"）
  ↓
runDirectorStructuredOutlinePhase()
  ↓
beat_sheet → chapter_list → chapter_sync
  ↓
启动 PipelineExecutionService.startPipelineExecution()
  ↓
初始化流水线状态
  ↓
启动第1章细化
```

### 4.2 章节细化完成流程

```
章节A细化完成
  ↓
PipelineExecutionService.handleChapterRefinementComplete()
  ↓
检查是否有阻塞
  ├─ 有阻塞 → 等待阻塞解除
  └─ 无阻塞 → 启动章节A写作
                ↓
              启动章节B细化（并行）
```

### 4.3 章节写作完成流程

```
章节A写作完成
  ↓
PipelineExecutionService.handleChapterWritingComplete()
  ↓
执行自动审校
  ↓
QualityGateWithBlocking.handleReviewResult()
  ├─ 审校通过 → 继续下一个章节写作
  └─ 审校未通过
       ├─ 需要人工审核 → 阻塞后续写作，发送通知
       └─ 不需要人工审核 → 尝试自动修复
```

### 4.4 人工审核恢复流程

```
用户完成人工审核修复
  ↓
PipelineExecutionService.resumeBlockedWriting()
  ↓
清除阻塞状态
  ↓
恢复后续章节写作
```

---

## 5. 状态管理

### 5.1 流水线状态机

```
                    ┌─────────────────┐
                    │   初始化        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   细化中        │◄──────────────┐
                    └────────┬────────┘               │
                             │                        │
                             ▼                        │
                    ┌─────────────────┐               │
                    │   写作中        │───────────────┤
                    └────────┬────────┘               │
                             │                        │
                             ▼                        │
                    ┌─────────────────┐               │
                    │   审校中        │───────────────┤
                    └────────┬────────┘               │
                             │                        │
              ┌──────────────┼──────────────┐         │
              │              │              │         │
              ▼              ▼              ▼         │
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
     │ 审校通过    │ │ 需要人工审核│ │ 自动修复    │ │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ │
            │               │               │        │
            ▼               ▼               ▼        │
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
     │ 继续写作    │ │ 阻塞等待    │ │ 修复后重试  │─┘
     └─────────────┘ └──────┬──────┘ └─────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   完成          │
                   └─────────────────┘
```

### 5.2 状态持久化

```typescript
// 保存到数据库
interface PipelineState {
  mode: "batch" | "pipeline";
  status: "idle" | "running" | "paused" | "blocked" | "completed";
  refinementProgress: {
    total: number;
    completed: number;
    currentChapterId?: string;
  };
  writingProgress: {
    total: number;
    completed: number;
    currentChapterId?: string;
  };
  blockedChapterId?: string;
  blockingReason?: string;
  startedAt?: Date;
  updatedAt?: Date;
}
```

---

## 6. 错误处理

### 6.1 细化失败

```
章节A细化失败
  ↓
记录错误
  ↓
跳过章节A写作
  ↓
继续章节B细化
  ↓
报告错误给用户
```

### 6.2 写作失败

```
章节A写作失败
  ↓
尝试自动修复（最多1次）
  ├─ 修复成功 → 继续
  └─ 修复失败 → 记录质量债务，继续下一个章节
```

### 6.3 人工审核超时

```
人工审核超时（可配置，如24小时）
  ↓
发送提醒通知
  ↓
继续等待或跳过（根据配置）
```

---

## 7. 性能优化

### 7.1 并行度控制

- 最大并行细化数：1（避免资源竞争）
- 最大并行写作数：1（确保连续性）
- 细化与写作可并行

### 7.2 资源预取

- 使用 JIT 预取机制，提前准备下一章的 task sheet
- 缓存已生成的上下文，减少重复查询

### 7.3 数据库优化

- 使用批量更新，减少数据库调用
- 使用索引优化查询性能

---

## 8. 监控与日志

### 8.1 关键指标

- 流水线执行时间
- 细化完成率
- 写作完成率
- 人工审核阻塞次数
- 平均阻塞时间

### 8.2 日志级别

- INFO：流水线启动、章节完成
- WARN：审校失败、需要人工审核
- ERROR：细化失败、写作失败

---

## 9. 测试策略

### 9.1 单元测试

- PipelineExecutionService
- ChapterRefinementOrchestrator
- QualityGateWithBlocking

### 9.2 集成测试

- 流水线完整流程
- 暂停/恢复功能
- 人工审核阻塞/恢复

### 9.3 E2E 测试

- 用户触发自动导演
- 流水线模式执行
- 人工审核流程

---

## 10. 部署计划

### 10.1 阶段一：后端开发（2天）

- 数据模型扩展
- 核心服务实现
- 单元测试

### 10.2 阶段二：前端开发（1天）

- UI 组件实现
- 集成测试

### 10.3 阶段三：集成测试（1天）

- E2E 测试
- 性能测试

### 10.4 阶段四：文档更新（0.5天）

- 用户文档
- 开发文档

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 细化与写作状态不一致 | 数据损坏 | 使用数据库事务，确保原子性 |
| 人工审核阻塞导致流水线停滞 | 用户体验差 | 设置超时机制，允许跳过 |
| 并行执行导致资源竞争 | 性能下降 | 限制并行度，使用队列控制 |
| 错误处理复杂 | 调试困难 | 添加详细日志，提供错误恢复机制 |
