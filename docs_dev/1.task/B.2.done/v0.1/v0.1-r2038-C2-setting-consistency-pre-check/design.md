---
description: "REQ-2038 设定一致性前置校验技术设计文档"
---

# REQ-2038 技术设计文档

## 1. 架构概述

### 1.1 系统架构

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Client (React)  │────▶│ Server (Express)  │────▶│  LLM Provider    │
│  设定页面         │     │ 校验服务           │     │ (structured invoke)│
│  + 校验面板       │     │ + prompting/      │     └──────────────────┘
└─────────────────┘     └────────┬─────────┘
                                 │
                          ┌──────▼──────┐
                          │ File System  │
                          │ 校验报告 JSON │
                          └─────────────┘
```

### 1.2 目录结构

```
server/src/
├── prompting/
│   ├── assets/
│   │   └── setting-consistency-check.ts   # 校验 prompt 定义
│   └── registry.ts                        # 注册新 prompt
├── services/
│   └── setting/
│       └── settingConsistencyService.ts    # 校验业务逻辑
├── routes/ 或 modules/
│   └── (setting 相关路由入口)               # API 端点
└── (auto-director 集成点)                  # world building 回调

shared/types/
└── settingConsistency.ts                   # SettingConsistencyReport 等类型

client/src/components/
└── setting/
    └── SettingConsistencyPanel.tsx          # 校验结果展示面板
```

## 2. Prompt 设计

### 2.1 Prompt Asset 定义

```typescript
// server/src/prompting/assets/setting-consistency-check.ts
import type { PromptAsset } from '../types';

export const settingConsistencyCheckPrompt: PromptAsset = {
  id: 'setting-consistency-check',
  name: '设定一致性校验',
  description: '检测小说设定中的内部矛盾、时间线冲突和世界观不自洽',
  version: '1.0',
  tags: ['setting', 'consistency', 'validation'],
  template: {
    system: `你是一位专业的小说设定一致性审查员。你的任务是检查给定的小说设定数据中是否存在内部矛盾。

检查维度：
1. **字段间矛盾**：同一设定体系内不同字段的逻辑冲突
2. **时间线冲突**：时间相关字段的矛盾
3. **世界观不自洽**：世界观层面的逻辑不通

输出要求：
- 返回严格的 JSON 格式
- 每个矛盾项包含 severity、category、涉及字段、描述和修复建议
- 如果没有矛盾，contradictions 数组为空，overallScore 为 "pass"
- summary 用简洁中文描述校验结果`,
    user: `请检查以下小说设定的一致性：

{{settings}}

请以 JSON 格式返回校验结果。`,
  },
  outputSchema: 'SettingConsistencyReport',
};
```

### 2.2 Prompt 调用方式

使用项目已有的 `invokeStructuredLlm` 或等效 structured invoke 机制：

```typescript
const result = await invokeStructuredLlm({
  promptAssetId: 'setting-consistency-check',
  input: { settings: JSON.stringify(projectSettings) },
  outputSchema: SettingConsistencyReportSchema,
});
```

## 3. 校验服务接口

### 3.1 SettingConsistencyService

```typescript
class SettingConsistencyService {
  /**
   * 执行设定一致性校验
   */
  async checkConsistency(
    projectId: string,
    settings: ProjectSettings
  ): Promise<SettingConsistencyReport>;

  /**
   * 获取最新校验报告
   */
  async getReport(projectId: string): Promise<SettingConsistencyReport | null>;

  /**
   * 忽略某条矛盾
   */
  async ignoreContradiction(
    projectId: string,
    contradictionId: string
  ): Promise<void>;

  /**
   * 一键修复某条矛盾
   */
  async fixContradiction(
    projectId: string,
    contradictionId: string
  ): Promise<{ fixed: boolean; updatedSettings: Partial<ProjectSettings> }>;
}
```

### 3.2 Auto-Director 集成点

```typescript
// 在 world building 完成回调中
async function onWorldBuildingComplete(projectId: string, settings: ProjectSettings) {
  // 异步执行校验，不阻断主流程
  settingConsistencyService.checkConsistency(projectId, settings)
    .then(report => {
      // 写入报告存储
      saveReport(projectId, report);
    })
    .catch(err => {
      // 校验失败仅记录日志，不阻断
      logger.warn('Setting consistency check failed', { projectId, error: err.message });
    });
}
```

## 4. 结果存储格式

### 4.1 文件结构

```
server/data/projects/{projectId}/consistency-reports/
├── latest.json              # 最新校验报告
├── history/                 # 历史报告（可选，后续迭代）
│   ├── 2026-07-03T10-00-00.json
│   └── 2026-07-04T14-30-00.json
└── ignored.json             # 已忽略的矛盾 ID 列表
```

### 4.2 latest.json 格式

```json
{
  "projectId": "project-001",
  "checkedAt": "2026-07-03T10:00:00+08:00",
  "overallScore": "warning",
  "summary": "检测到 2 处矛盾：1 处严重（科技水平与武器不匹配），1 处警告（时间线计算偏差）",
  "contradictions": [
    {
      "id": "c-001",
      "severity": "critical",
      "category": "field_conflict",
      "fieldA": "科技水平",
      "valueA": "原始社会",
      "fieldB": "武器",
      "valueB": "激光枪",
      "description": "科技水平为原始社会，但存在激光枪武器，两者矛盾",
      "suggestion": "将科技水平调整为'未来科幻'，或将武器调整为'石矛/弓箭'"
    }
  ],
  "ignoredIds": []
}
```

### 4.3 ignored.json 格式

```json
{
  "ignoredContradictions": [
    {
      "id": "c-001",
      "ignoredAt": "2026-07-03T11:00:00+08:00",
      "reason": "已知设定，魔导科技融合"
    }
  ]
}
```

## 5. Client 展示方案

### 5.1 SettingConsistencyPanel 组件

**位置**：嵌入设定页面（Settings Page）

**布局**：

```
┌─────────────────────────────────────────┐
│ 设定一致性校验                    [校验] │
├─────────────────────────────────────────┤
│ 总体评分: ⚠️ Warning  校验时间: 07-03 10:00 │
├─────────────────────────────────────────┤
│ ⚠️ Critical: 科技水平 与 武器 矛盾       │
│   原始社会 vs 激光枪                      │
│   建议: 将科技水平调整为"未来科幻"         │
│                              [一键修复] [忽略] │
├─────────────────────────────────────────┤
│ ℹ️ Warning: 建国时间 与 历史记载 冲突      │
│   2000年 vs 3000年文明                     │
│   建议: 统一时间线设定                     │
│                              [一键修复] [忽略] │
└─────────────────────────────────────────┘
```

### 5.2 状态管理

- 使用 TanStack Query 缓存校验报告
- 校验触发后轮询或 WebSocket 获取结果（LLM 调用可能耗时较长）
- 乐观更新：忽略/修复操作后立即从列表移除，后端确认后最终同步

### 5.3 交互流程

1. 页面加载 → 获取最新报告（GET API）
2. 点击"校验" → POST 触发校验 → 显示加载态 → 轮询获取结果
3. 点击"一键修复" → POST 修复 API → 显示修复进度 → 刷新报告
4. 点击"忽略" → POST 忽略 API → 从列表移除

## 6. 类型定义（shared）

```typescript
// shared/types/settingConsistency.ts

export interface SettingConsistencyReport {
  projectId: string;
  checkedAt: string;
  contradictions: Contradiction[];
  overallScore: 'pass' | 'warning' | 'fail';
  summary: string;
  ignoredIds: string[];
}

export interface Contradiction {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'field_conflict' | 'timeline_conflict' | 'worldview_inconsistency';
  fieldA: string;
  valueA: string;
  fieldB: string;
  valueB: string;
  description: string;
  suggestion: string;
}

export interface IgnoredContradiction {
  id: string;
  ignoredAt: string;
  reason?: string;
}
```

## 7. 测试策略

### 7.1 单元测试

- SettingConsistencyService：校验触发、报告读写、忽略逻辑
- Prompt 输出解析：确保 LLM 输出可正确解析为结构化报告

### 7.2 集成测试

- API 端点测试：触发校验、获取报告、忽略、修复
- Auto-Director 集成测试：world building 完成后自动触发校验

### 7.3 E2E 测试

- 设定页面：触发校验 → 查看结果 → 一键修复 → 忽略

## 8. 依赖项

- 项目已有：`invokeStructuredLlm`、prompting 框架、Zod schema
- 新增依赖：无（复用现有 LLM 调用基础设施）
