# REQ-3014 批量润色功能

## 需求概要

**需求编号**：3014  
**需求类型**：UI/UX + 后端功能增强  
**创建时间**：2026-07-12  
**状态**：requirements_ready  
**复杂度**：medium  
**优先级**：high

---

## 背景与问题

### 当前实现
1. **写正文时（步骤6）**：会注入风格合约（styleContract）作为 prompt 约束，但只是提示，不能保证执行
2. **写完后**：PostGenerationStyleReviewRunner 会自动检测和修复高风险（≥35分）章节的风格问题
3. **问题**：只能单章修复，无法批量处理整本书的风格问题

### 用户痛点
- **单章修复效率低**：如果整本书有很多风格问题，需要逐章修复
- **无法批量处理**：没有批量检测和修复所有章节的功能
- **进度不透明**：无法看到批量处理的进度和结果

---

## 目标

实现批量润色功能，允许用户：

1. **批量检测**：扫描所有章节的风格问题
2. **批量修复**：对有问题的章节进行重写
3. **进度追踪**：显示处理进度和结果
4. **选择性修复**：只处理有问题的章节，跳过健康的章节

---

## 非目标

- 不改变现有的单章修复逻辑
- 不改变风格检测的逻辑（StyleDetectionService）
- 不改变风格重写的逻辑（StyleRewriteService）
- 不涉及新的风格规则添加

---

## 功能规格

### F1: 批量润色触发入口

**位置**：
- 小说详情页 / 创作工作台
- "批量操作" 菜单或按钮组

**交互**：
- 点击 "批量润色" 按钮
- 显示确认对话框（可选）
- 开始批量处理

### F2: 批量检测

**功能**：
- 调用 StyleDetectionService 逐章检测风格问题
- 收集所有章节的问题列表
- 统计问题总数、严重程度分布

**返回数据**：
```typescript
interface BatchDetectionResult {
  totalChapters: number;
  chaptersWithIssues: number;
  totalIssues: number;
  issuesBySeverity: {
    high: number;    // riskScore >= 70
    medium: number;  // 35 <= riskScore < 70
    low: number;     // riskScore < 35
  };
  chapterReports: Array<{
    chapterId: string;
    chapterOrder: number;
    title: string;
    riskScore: number;
    violationCount: number;
    canAutoRewrite: boolean;
  }>;
}
```

### F3: 批量修复

**功能**：
- 对可修复的章节（canAutoRewrite = true）进行重写
- 只修复风险分 ≥ 35 的章节
- 按优先级排序（高风险先修复）
- 支持中断和继续

**流程**：
1. 获取章节列表（按章节顺序）
2. 逐章检测风格问题
3. 如果风险分 ≥ 35 且有可修复的问题，调用 StyleRewriteService.rewrite()
4. 保存修复后的章节内容
5. 更新进度

**返回数据**：
```typescript
interface BatchPolishResult {
  totalProcessed: number;
  totalRewritten: number;
  totalSkipped: number;
  totalTimeMs: number;
  chapterResults: Array<{
    chapterId: string;
    chapterOrder: number;
    title: string;
    status: 'rewritten' | 'skipped' | 'failed';
    originalRiskScore: number;
    newRiskScore: number;
    issuesFixed: number;
    error?: string;
  }>;
}
```

### F4: 进度追踪

**功能**：
- 显示批量处理的进度
- 实时更新处理状态
- 显示当前处理的章节信息

**UI 组件**：
```
┌─────────────────────────────────────────────────┐
│ 批量润色进度                                     │
│ ─────────────────────────────────────────────── │
│ 进度：[████████░░░░░░░░░░░░] 40% (10/25 章)    │
│ 当前：第11章 - "意外的相遇"                     │
│ 状态：检测中...                                 │
│ 已修复：8 章 | 跳过：2 章 | 失败：0 章         │
│ ─────────────────────────────────────────────── │
│ [暂停] [取消]                                   │
└─────────────────────────────────────────────────┘
```

### F5: 结果展示

**功能**：
- 批量处理完成后显示汇总报告
- 列出所有处理的章节和结果
- 支持查看详情和手动干预

**UI 组件**：
```
┌─────────────────────────────────────────────────┐
│ 批量润色完成                                     │
│ ─────────────────────────────────────────────── │
│ 📊 汇总                                         │
│ 总章节数：25                                     │
│ 已修复：18 章 (72%)                             │
│ 跳过：5 章 (20%)                                │
│ 失败：2 章 (8%)                                 │
│ 总耗时：12 分钟                                 │
│ ─────────────────────────────────────────────── │
│ 📝 修复详情                                     │
│ ✅ 第3章 - "初遇" (风险分 85 → 25)              │
│ ✅ 第7章 - "危机" (风险分 72 → 18)              │
│ ⏭️ 第12章 - "平静" (风险分 20, 跳过)            │
│ ❌ 第15章 - "转折" (失败: LLM 超时)             │
│ ...                                             │
│ ─────────────────────────────────────────────── │
│ [查看全部] [导出报告] [关闭]                     │
└─────────────────────────────────────────────────┘
```

---

## 技术设计

### 后端 API

#### 1. 批量检测接口

```
POST /api/novel/:novelId/batch-style-detect

Request: {
  chapterIds?: string[];  // 可选，指定章节；为空则检测全部
}

Response: {
  success: boolean;
  data: BatchDetectionResult;
}
```

#### 2. 批量修复接口

```
POST /api/novel/:novelId/batch-style-polish

Request: {
  chapterIds?: string[];  // 可选，指定章节；为空则修复全部
  options?: {
    riskThreshold?: number;  // 默认 35
    maxConcurrency?: number; // 默认 1
    continueOnFailure?: boolean; // 默认 true
  };
}

Response: {
  success: boolean;
  data: {
    jobId: string;  // 用于追踪进度
  };
}
```

#### 3. 进度查询接口

```
GET /api/novel/:novelId/batch-style-polish/:jobId/progress

Response: {
  success: boolean;
  data: {
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
      total: number;
      processed: number;
      rewritten: number;
      skipped: number;
      failed: number;
    };
    currentChapter?: {
      chapterId: string;
      title: string;
      status: 'detecting' | 'rewriting' | 'saving';
    };
    result?: BatchPolishResult;  // 完成时返回
  };
}
```

#### 4. 取消接口

```
POST /api/novel/:novelId/batch-style-polish/:jobId/cancel

Response: {
  success: boolean;
}
```

### 前端组件

```
client/src/components/batch-polish/
├── index.tsx                      # 主入口
├── BatchPolishButton.tsx          # 触发按钮
├── BatchPolishDialog.tsx          # 确认对话框
├── BatchPolishProgress.tsx        # 进度显示组件
├── BatchPolishResult.tsx          # 结果展示组件
├── BatchPolishDetail.tsx          # 详情查看组件
└── hooks/
    ├── useBatchPolish.ts          # 批量润色 Hook
    └── useBatchPolishProgress.ts  # 进度追踪 Hook
```

### 状态管理

```typescript
interface BatchPolishState {
  status: 'idle' | 'detecting' | 'polishing' | 'completed' | 'failed' | 'cancelled';
  detectionResult?: BatchDetectionResult;
  polishResult?: BatchPolishResult;
  progress?: {
    total: number;
    processed: number;
    rewritten: number;
    skipped: number;
    failed: number;
    currentChapter?: {
      chapterId: string;
      title: string;
      status: string;
    };
  };
  error?: string;
}
```

---

## 依赖项

### 后端依赖
1. `StyleDetectionService` - 已有
2. `StyleRewriteService` - 已有
3. `Prisma` - 已有
4. `BackgroundJobService` 或类似机制 - 需要新增或复用

### 前端依赖
1. Ant Design - 已有
2. React 19 - 已有
3. TanStack Query - 已有

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| LLM 调用超时 | 高 | 设置合理的超时时间，支持重试 |
| 并发控制 | 中 | 限制并发数，避免 API 限流 |
| 内存占用 | 中 | 逐章处理，不加载全部章节到内存 |
| 取消操作 | 低 | 支持优雅取消，保存已完成的章节 |

---

## 验收条目

### REQ-3014-01 批量检测
**当** 用户点击批量检测按钮时，**系统应** 扫描所有章节的风格问题  
**验收标准**：
- 返回每个章节的风险分和问题数
- 统计问题分布（高/中/低风险）
- 处理时间 < 5 分钟（25 章）

### REQ-3014-02 批量修复
**当** 用户确认批量修复时，**系统应** 对高风险章节进行重写  
**验收标准**：
- 只修复风险分 ≥ 35 的章节
- 支持中断和继续
- 修复后风险分显著降低

### REQ-3014-03 进度追踪
**给定** 批量修复正在进行中  
**当** 用户查看进度时，**系统应** 显示实时进度  
**验收标准**：
- 显示当前处理的章节
- 显示已修复/跳过/失败的统计
- 支持暂停和取消

### REQ-3014-04 结果展示
**当** 批量修复完成时，**系统应** 显示汇总报告  
**验收标准**：
- 列出所有处理的章节
- 显示修复前后的风险分对比
- 支持查看详情和导出报告

---

## 工作量估算

| 阶段 | 任务数 | 工作量 |
|------|--------|--------|
| 阶段一：后端 API | 4 | 3-4h |
| 阶段二：前端组件 | 5 | 4-5h |
| 阶段三：集成与测试 | 3 | 2-3h |
| **总计** | **12** | **9-12h** |

---

## 参考文档

- StyleDetectionService: `server/src/services/styleEngine/StyleDetectionService.ts`
- StyleRewriteService: `server/src/services/styleEngine/StyleRewriteService.ts`
- PostGenerationStyleReviewRunner: `server/src/services/novel/runtime/PostGenerationStyleReviewRunner.ts`
- 项目编码规范：`.claude/CLAUDE.md`
