---
description: "REQ-2023 任务分解清单"
id: REQ-2023
title: 资源变更风险拒绝意图注入 - 任务清单
version: 0.1
created: 2026-06-28
---

# REQ-2023: 任务分解

## 阶段一：数据层（后端）

### T-1.1: Reject API 支持意图参数
- **文件**: `server/src/modules/novel/characters/http/novelCharacterResourceRoutes.ts`
- **工作内容**:
  - 添加 reject body schema（reason, intent 可选字段）
  - 修改 reject handler，将意图保存到 validationNotesJson
  - 格式: `rejectedIntent:xxx`, `rejectedReason:xxx`
- **DoD**: API 测试通过，意图正确保存
- **估时**: 0.5h
- **依赖**: 无

### T-1.2: 类型定义更新
- **文件**: `shared/types/characterResource.ts`
- **工作内容**:
  - 在 `characterResourceProposalSummarySchema` 添加 `rejectedIntent` 和 `rejectedReason` 可选字段
  - 重新 build shared
- **DoD**: 类型检查通过
- **估时**: 0.25h
- **依赖**: 无

## 阶段二：UI 层（前端）

### T-2.1: Reject API 函数更新
- **文件**: `client/src/api/novel/characters.ts`
- **工作内容**:
  - 修改 `rejectCharacterResourceProposal` 函数，支持传入 `reason` 和 `intent` 参数
- **DoD**: 类型检查通过
- **估时**: 0.25h
- **依赖**: T-1.2

### T-2.2: 添加"不接受此风险"按钮
- **文件**: `client/src/pages/novels/components/NovelTaskDrawer.tsx`
- **工作内容**:
  - 在 `ResourceProposalCard` 中为高风险 proposal 添加"不接受此风险"按钮
  - 按钮仅在 `riskLevel === "high"` 时显示
- **DoD**: 按钮正确显示，点击打开意图输入对话框
- **估时**: 0.5h
- **依赖**: 无

### T-2.3: 实现意图输入对话框
- **文件**: `client/src/pages/novels/components/NovelTaskDrawer.tsx`
- **工作内容**:
  - 创建 `RejectIntentDialog` 组件
  - 包含 Textarea 输入框（可选填写）
  - 提交时调用 reject API 并传入意图
- **DoD**: 对话框正常工作，意图正确提交
- **估时**: 1h
- **依赖**: T-2.1, T-2.2

### T-2.4: Mutation 处理更新
- **文件**: `client/src/pages/novels/NovelEdit.tsx`
- **工作内容**:
  - 修改 `rejectCharacterResourceProposalMutation` 支持传入意图参数
  - 更新 toast 提示信息
- **DoD**: 确认/忽略操作正常工作
- **估时**: 0.5h
- **依赖**: T-2.1

## 阶段三：业务层（AI Prompt 注入）

### T-3.1: 读取 rejected intentions
- **文件**: `server/src/services/novel/characterResource/CharacterResourceLedgerService.ts`
- **工作内容**:
  - 添加 `getRejectedIntentsForChapter(novelId, chapterId)` 方法
  - 解析 validationNotesJson 中的 `rejectedIntent`
- **DoD**: 方法返回正确的意图列表
- **估时**: 0.5h
- **依赖**: T-1.1

### T-3.2: 注入到章节修复 Prompt
- **文件**: `server/src/prompting/prompts/novel/chapterPatchRepair.prompts.ts` 或相关文件
- **工作内容**:
  - 在 prompt 模板中添加"用户修正意图"部分
  - 调用 T-3.1 的方法获取意图并注入
- **DoD**: AI 修复时能参考用户意图
- **估时**: 1h
- **依赖**: T-3.1

## 阶段四：测试与验证

### T-4.1: 单元测试
- **文件**: `server/tests/` 相关测试文件
- **工作内容**:
  - 测试 validationNotes 解析逻辑
  - 测试 reject API 传入意图参数
- **DoD**: 测试通过
- **估时**: 0.5h
- **依赖**: T-1.1

### T-4.2: E2E 测试
- **工作内容**:
  - 手动测试完整流程：拒绝 → 填写意图 → 章节修复 → AI 参考意图
- **DoD**: 流程顺畅，AI 输出符合预期
- **估时**: 1h
- **依赖**: T-2.4, T-3.2

## 任务依赖图

```
T-1.1 (API 支持意图) ──┬── T-2.1 (前端 API 函数) ──┬── T-2.3 (意图对话框) ── T-2.4 (Mutation)
T-1.2 (类型定义) ──────┘                           │
                                                   │
T-3.1 (读取意图) ────────────────────────────────── T-3.2 (注入 Prompt)
                                                   │
T-2.2 (按钮) ──────────────────────────────────────┘
```

## 工时估算

| 阶段 | 工时 |
|------|------|
| 数据层 | 0.75h |
| UI 层 | 2.25h |
| 业务层 | 1.5h |
| 测试 | 1.5h |
| **总计** | **6h** |

## 验证清单

- [x] T-1.1: Reject API 支持意图参数
- [x] T-1.2: 类型定义更新
- [x] T-2.1: Reject API 函数更新
- [x] T-2.2: 添加"不接受此风险"按钮
- [x] T-2.3: 实现意图输入对话框
- [x] T-2.4: Mutation 处理更新
- [x] T-3.1: 读取 rejected intentions
- [x] T-3.2: 注入到章节修复 Prompt
- [x] T-4.1: 单元测试
- [x] T-4.2: E2E 测试
