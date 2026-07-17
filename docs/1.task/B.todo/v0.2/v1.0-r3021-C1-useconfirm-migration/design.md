# 设计文档 — REQ-3021 useConfirm 迁移

## 1. 迁移模式

### 标准替换模式

```typescript
// 修改前：同步 window.confirm
function handleDelete() {
  if (window.confirm('确定要删除吗？')) {
    deleteItem();
  }
}

// 修改后：异步 useConfirm
function handleDelete() {
  const { confirm } = useConfirm();
  confirm('确定要删除吗？').then((ok) => {
    if (ok) deleteItem();
  });
}

// 或使用 async/await
async function handleDelete() {
  const { confirm } = useConfirm();
  const ok = await confirm('确定要删除吗？');
  if (ok) deleteItem();
}
```

### window.prompt 替换模式

```typescript
// 修改前：同步 window.prompt
const name = window.prompt('请输入名称：');
if (name) { updateName(name); }

// 修改后：使用 useConfirm 的 prompt 变体
const { prompt } = useConfirm();
const name = await prompt('请输入名称：');
if (name) { updateName(name); }
```

## 2. 分批计划

| 批次 | 模块 | 预估文件数 | 优先级 |
|------|------|-----------|--------|
| 1 | worlds | 3 | P1 |
| 2 | characters | 2 | P1 |
| 3 | novels/components (group 1) | 6 | P2 |
| 4 | novels/components (group 2) | 4 | P2 |
| 5 | novels/pages | 1 | P2 |
| 6 | settings | 1 | P3 |
| 7 | knowledge | 2 | P3 |
| 8 | genres + storyModes | 2 | P3 |
| 9 | writingFormula + titles | 2 | P3 |
| 10 | autoDirector (+ confirm fix) | 3 | P1 |

## 3. 关键注意事项

1. **异步转换**：所有 `window.confirm` 的返回值从同步 `boolean` 变为异步 `Promise<boolean>`，调用方必须 `await`
2. **Hook 位置**：`useConfirm` 必须在组件顶层调用，不能在回调内调用
3. **事件处理器**：React 事件处理器支持 `async`，可直接使用 `await`
4. **非组件上下文**：如果在非 React 组件中使用 confirm，需通过 props 传入或使用全局 confirm 实例

## 4. 测试策略

- 每个批次完成后运行 `pnpm typecheck` 和 `pnpm test:client`
- 全部完成后手动验证每个确认对话框的 UI 和行为
- E2E 测试验证关键用户流程中的确认操作
