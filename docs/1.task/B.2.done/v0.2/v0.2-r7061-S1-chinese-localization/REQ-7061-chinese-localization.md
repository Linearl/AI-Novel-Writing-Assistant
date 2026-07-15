---
reqId: 7061
title: "中文本地化 — 需求文档（工作副本）"
status: requirements_ready
priority: P0
complexity: S1
estimatedEffort: "1天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7061: 中文本地化

## 1. 需求背景

### 1.1 问题描述

当前系统内大量上下文块标签、角色引导文本、关系阶段描述等使用英文显示，国内用户在使用自动导演和审校功能时，看到英文标签影响理解和使用效率。这些标签直接显示在 UI 中，是用户可感知的文本。

### 1.2 现状分析

**需要中文化的区域**：
- 章节任务块标签（Chapter Task Block）
- 义务契约块标签（Obligation Contract Block）
- 本地状态标签（Local State Labels）
- 参与者引导文本（Participant Guidance）
- 角色引导文本（Character Guidance）
- 关系阶段文本（Relationship Stage Text）
- 32 个 context group ID 的显示标签
- `toListBlock()` 空兜底文案（当前为英文空串或占位文本）

**上游参考**：
- 上游已实现完整的中文标签映射（`contextGroupLabels.ts`，38 行）
- 上游上下文块定义中已包含中文标签（`chapterLayeredContextShared.ts`，420 行）

### 1.3 目标用户

所有使用系统的中文用户。

## 2. 需求定义

### 2.1 功能需求

#### FR-1: Context Group ID 中文标签映射

**描述**：为 32 个 context group ID 提供中文显示标签，替换当前的英文标识。

**标签映射示例**：
| Context Group ID | 当前显示 | 目标显示 |
|-----------------|---------|---------|
| `chapterTask` | Chapter Task | 章节任务 |
| `obligationContract` | Obligation Contract | 义务契约 |
| `localState` | Local State | 本地状态 |
| `characterGuide` | Character Guide | 角色引导 |
| `relationshipStage` | Relationship Stage | 关系阶段 |
| `participantGuide` | Participant Guide | 参与者引导 |
| ... | ... | ... |

**验收标准**：
- [ ] 32 个 context group ID 全部有中文映射
- [ ] 映射表集中在一处管理（`contextGroupLabels.ts` 或等效文件）
- [ ] 映射缺失时回退到英文 ID（不会报错）

#### FR-2: 章节上下文块标签中文化

**描述**：`chapterLayeredContextShared.ts` 中定义的上下文块标签从英文切换为中文。

**涉及块类型**：
- 章节任务块（Chapter Task Block）
- 义务契约块（Obligation Contract Block）
- 本地状态块（Local State Block）
- 角色引导块（Character Guide Block）
- 参与者引导块（Participant Guide Block）
- 关系阶段块（Relationship Stage Block）

**验收标准**：
- [ ] 所有块标签切换为中文
- [ ] 块内容结构不变（仅标签文本变化）
- [ ] 生成的 prompt 中标签为中文

#### FR-3: toListBlock 空兜底文案

**描述**：`toListBlock()` 函数在输入为空时，返回中文"无"替代当前的空串或英文占位符。

**验收标准**：
- [ ] 空列表输入返回"无"
- [ ] 非空列表正常输出
- [ ] 不影响列表块的结构化格式

#### FR-4: 角色引导/关系阶段文本中文化

**描述**：角色引导和关系阶段的描述性文本切换为中文。

**验收标准**：
- [ ] 所有引导文本为中文
- [ ] 文本自然流畅，非机翻风格

### 2.2 非功能需求

#### NFR-1: 可维护性

- 中文标签集中管理，方便后续新增或修改
- 支持未来多语言扩展（i18n 架构预留）

#### NFR-2: 向后兼容

- prompt 结构不变，仅标签文本变化
- LLM 对中文标签的理解不受影响

## 3. 技术约束

### 3.1 架构约束

- 标签映射集中在 `contextGroupLabels.ts` 等效文件中
- 不引入 i18n 框架（当前仅中文需求）
- 标签变更不影响 prompt 结构

### 3.2 依赖约束

- 无前置依赖
- 无后续依赖

### 3.3 数据约束

- 标签为纯字符串常量，无持久化需求

## 4. 验收标准

### 4.1 功能验收

- [ ] 32 个 context group ID 有中文映射
- [ ] 章节上下文块标签全部中文化
- [ ] toListBlock 空兜底返回"无"
- [ ] 角色引导/关系阶段文本为中文

### 4.2 质量验收

- [ ] 中文文本自然流畅
- [ ] 无遗漏的英文标签
- [ ] 生成的 prompt 中标签为中文

### 4.3 测试验收

- [ ] 单元测试覆盖标签映射完整性
- [ ] typecheck 通过
- [ ] pnpm test 通过

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| LLM 对中文标签理解差异 | 生成质量下降 | 低 | 主流 LLM 均支持中文标签 |
| 标签遗漏 | 部分仍显示英文 | 中 | 全量 grep 验证 |
| 上游映射不完整 | 部分 ID 无映射 | 低 | 补全缺失映射 |

## 6. 工作量评估

- **开发时间**：0.5 天
- **测试时间**：0.2 天
- **验证时间**：0.3 天
- **总计**：1 天

## 7. 优先级

**P0** — 最高优先级（零成本高收益）

**理由**：
- 纯字符串替换，开发成本极低
- 直接提升国内用户体验
- 上游有完整映射可复用
- 不涉及架构变更，风险为零
