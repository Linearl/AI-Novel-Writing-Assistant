---
description: 26个文件从 window.confirm/window.prompt 迁移到 useConfirm hook，按模块分10批执行
---

# REQ-3021 — window.confirm/window.prompt 迁移到 useConfirm

## 1. 背景

项目中 26 个文件仍在使用同步阻塞的 `window.confirm()` 和 `window.prompt()`，而项目已有异步的 `useConfirm` hook（返回 Promise）。需要将所有遗留调用迁移到 `useConfirm`，统一用户体验和交互模式。

**核心差异**：`window.confirm` 是同步阻塞的（返回 `boolean`），`useConfirm` 是异步的（返回 `Promise<boolean>`），调用方必须改为 `await`。

## 2. 目标

将全部 26 个文件的 `window.confirm` / `window.prompt` 调用迁移到 `useConfirm` hook，统一确认对话框的 UI 风格和行为。

## 3. 范围

### 包含

按模块分 10 批，共 26 个文件：

| 批次 | 模块 | 文件数 | 说明 |
|------|------|--------|------|
| 1 | worlds | 3 | 世界观相关组件 |
| 2 | characters | 2 | 角色相关组件 |
| 3 | novels/components (1) | 6 | 小说通用组件 |
| 4 | novels/components (2) | 4 | 小说通用组件（续） |
| 5 | novels/pages | 1 | 小说页面 |
| 6 | settings | 1 | 设置组件 |
| 7 | knowledge | 2 | 知识库组件 |
| 8 | genres + storyModes | 2 | 流派和故事模式 |
| 9 | writingFormula + titles | 2 | 写作公式和标题 |
| 10 | autoDirector | 2+1 | 自动导演组件 + 确认修复 |

### 不包含

- 新增 useConfirm 功能
- 修改 useConfirm hook 本身
- 非 confirm/prompt 迁移的代码变更

## 4. 非目标

- 不改变确认对话框的文案
- 不修改 `useConfirm` hook 的 API

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | 26 个文件中的 `window.confirm` 调用全部替换为 `useConfirm` |
| AC-2 | 所有 `window.prompt` 调用替换为 `useConfirm`（如有） |
| AC-3 | 所有调用方正确使用 `await` 等待异步结果 |
| AC-4 | 确认对话框的用户体验保持一致 |
| AC-5 | `pnpm typecheck` 零错误 |
| AC-6 | `pnpm test:client` 全部通过 |

## 6. 迁移模式

```typescript
// 修改前（同步）
const shouldDelete = window.confirm('确定要删除吗？');
if (shouldDelete) { ... }

// 修改后（异步）
const { confirm } = useConfirm();
const shouldDelete = await confirm('确定要删除吗？');
if (shouldDelete) { ... }
```

## 7. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 同步改异步可能影响执行流程 | 高 | 确保 `confirm` 调用方已改为 `await` 或正确处理 Promise |
| 组件需要获取 `useConfirm` hook 实例 | 低 | 使用现有 hook 注册机制，确保组件内可用 |
| 大面积改动可能引入回归 | 中 | 按批次逐个验证，每个批次完成后运行测试 |
