---
description: "REQ-7002 NovelEdit.tsx 大文件拆分（原始冻结副本）"
---

# REQ-7002 NovelEdit.tsx 大文件拆分

> 状态：⏳ 进行中
> 冻结日期：2026-06-28

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7002 |
| 优先级 | P1 |
| 来源 | 2026-06-28 健康检查报告 |
| 关联需求 | 无 |

---

## 1. 背景与问题

`client/src/pages/novels/NovelEdit.tsx` 达 2731 行，是项目约束的近 4 倍。

---

## 2. 目标与范围

### 2.1 目标

1. NovelEdit.tsx 降至 ≤ 400 行
2. 拆分出的每个子文件 ≤ 600 行
3. 功能零回归

### 2.2 In Scope

- `client/src/pages/novels/NovelEdit.tsx`
- 新建 `client/src/pages/novels/components/novelEdit/`

### 2.3 Out of Scope

- 已有独立组件、后端代码、样式重构

---

## 3. 验收标准

- [ ] NovelEdit.tsx ≤ 400 行
- [ ] 所有新建文件 ≤ 600 行
- [ ] `pnpm typecheck` 0 错误
- [ ] `pnpm build` 成功
- [ ] 页面功能无回归

---

## 4. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-28 | 创建 | 健康检查报告触发 |
