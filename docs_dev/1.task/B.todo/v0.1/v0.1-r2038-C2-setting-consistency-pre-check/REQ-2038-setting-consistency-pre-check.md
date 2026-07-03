---
description: "REQ-2038 设定一致性前置校验需求文档（工作副本）"
---

# REQ-2038: 设定一致性前置校验

## 1. 需求概述

### 1.1 背景

AI 小说创作系统中，设定（世界观、人物、历史、科技水平等）是后续情节生成的基础。当设定数量增多后，容易出现字段间互相矛盾、时间线冲突、世界观逻辑不自洽等问题。本次需求来源于竞品分析（游蜂写作），该竞品在设定管理中提供了自动一致性检测能力。

### 1.2 目标

分阶段实现设定一致性校验。本次（v0.1）先做 **LLM 内置校验**：

- 设定生成/修改后自动跑一次 LLM 校验
- 检测设定内部矛盾，输出结构化校验报告

### 1.3 非目标

- 不实现基于变更 diff 的增量影响分析（后续迭代）
- 不实现跨章节/跨卷的设定一致性追踪（后续迭代）
- 不实现自动修复（本次只输出建议，用户手动或一键操作）

## 2. 功能需求

### 2.1 校验时机

#### 2.1.1 Auto-Director World Building 阶段

**触发条件**：auto-director 的 world building 阶段完成设定生成后

**行为**：
- 自动调用校验服务
- 校验结果写入设定数据
- 不阻断 auto-director 流程（质量门策略：校验结果为可见警告，非阻断错误）

#### 2.1.2 用户手动编辑设定后

**触发条件**：用户在设定页面保存设定后

**行为**：
- 可选触发校验（用户点击"校验一致性"按钮或保存时自动触发）
- 展示校验结果

### 2.2 校验内容

#### 2.2.1 字段间互相矛盾检测

检测同一设定体系内不同字段的逻辑矛盾。

示例：
- "科技水平 = 原始社会" 但 "武器 = 激光枪"
- "气候 = 热带沙漠" 但 "植被 = 冰雪覆盖的针叶林"

#### 2.2.2 时间线冲突检测

检测设定中时间相关字段的矛盾。

示例：
- "建国于 2000 年" 但 "历史记载 3000 年文明"
- "角色年龄 25 岁" 但 "出生于 3000 年" 但 "当前时间线 3020 年"（25 岁应为 3025 年）

#### 2.2.3 世界观逻辑不自洽

检测世界观层面的逻辑不通。

示例：
- "魔法世界" 但 "科技水平 = 赛博朋克"（未说明魔导科技融合设定）
- "封闭大陆" 但 "存在跨大陆贸易路线"

### 2.3 校验输出格式

```typescript
interface SettingConsistencyReport {
  projectId: string;
  checkedAt: string; // ISO 8601
  contradictions: Contradiction[];
  overallScore: 'pass' | 'warning' | 'fail'; // 无矛盾 / 有轻微矛盾 / 有严重矛盾
  summary: string; // LLM 生成的校验摘要
}

interface Contradiction {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'field_conflict' | 'timeline_conflict' | 'worldview_inconsistency';
  fieldA: string; // 矛盾字段 A
  valueA: string; // 字段 A 的值
  fieldB: string; // 矛盾字段 B
  valueB: string; // 字段 B 的值
  description: string; // 矛盾描述
  suggestion: string; // 修复建议
}
```

### 2.4 用户操作

#### 2.4.1 查看校验结果

- 设定页面展示校验报告（矛盾列表 + 严重级别 + 修复建议）
- 显示校验时间和总体评分

#### 2.4.2 一键修复

- 用户可选择某条矛盾，点击"一键修复"
- 系统调用 LLM 根据建议修改对应设定字段

#### 2.4.3 忽略

- 用户可标记某条矛盾为"已知/忽略"
- 忽略记录持久化，下次校验不再显示已忽略项

## 3. 技术需求

### 3.1 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/projects/:projectId/settings/consistency-check | 触发校验 |
| GET | /api/projects/:projectId/settings/consistency-report | 获取最新校验报告 |
| POST | /api/projects/:projectId/settings/consistency-report/ignore | 忽略某条矛盾 |
| POST | /api/projects/:projectId/settings/consistency-report/fix | 一键修复某条矛盾 |

### 3.2 Prompt 治理

- 校验 prompt 必须在 `server/src/prompting/` 注册为 `PromptAsset`
- 在 `prompting/registry.ts` 中注册
- 禁止在 service 文件中内联 prompt

### 3.3 存储

- 校验报告存储为结构化 JSON
- 路径：`server/data/projects/{projectId}/consistency-reports/latest.json`
- 忽略记录持久化到同一文件

### 3.4 性能要求

- 校验请求响应时间 < 30s（含 LLM 调用）
- 校验不阻断 auto-director 主流程

## 4. 验收标准

1. Prompt 在 `prompting/` 正确注册，可通过 prompt registry 获取
2. 校验服务接受设定数据，返回结构化报告
3. Auto-Director world building 阶段完成后自动触发校验
4. 设定页面可查看校验结果
5. 一键修复功能正常（调用 LLM 修改设定字段）
6. 忽略功能正常（标记后不再显示）
7. 类型检查通过
8. 单元测试通过

## 5. EARS 验收条目

### 5.1 校验触发

- **EARS-001**：当 auto-director world building 阶段完成时，系统应自动调用设定校验服务
- **EARS-002**：当用户在设定页面点击"校验一致性"时，系统应触发校验并返回结果

### 5.2 校验内容

- **EARS-003**：当校验检测到字段间互相矛盾时，系统应在报告中标记为 `field_conflict`
- **EARS-004**：当校验检测到时间线冲突时，系统应在报告中标记为 `timeline_conflict`
- **EARS-005**：当校验检测到世界观不自洽时，系统应在报告中标记为 `worldview_inconsistency`

### 5.3 用户操作

- **EARS-006**：当用户查看校验报告时，系统应展示矛盾列表、严重级别和修复建议
- **EARS-007**：当用户点击"一键修复"时，系统应调用 LLM 修改对应设定字段并重新校验
- **EARS-008**：当用户点击"忽略"时，系统应标记该矛盾为已忽略，后续校验不再显示
