---
description: "REQ-7001 Auto-Director 测试隔离修复（原始冻结副本）"
---

# REQ-7001 Auto-Director 测试隔离修复

> 状态：⏳ 进行中
> 冻结日期：2026-06-28

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7001 |
| 优先级 | P1 |
| 来源 | 2026-06-28 健康检查报告 |
| 关联需求 | 无 |

---

## 1. 背景与问题

`pnpm test` 批量运行时，4 个 auto-director 测试失败（测试通过率 79%），但单独运行每个测试文件全部通过。根因是测试间共享的 prisma mock 对象被前序测试污染。

失败测试：
1. `auto director approval preferences expose defaults and persist concrete approval points`
2. `auto director auto-approval audit records the event, appends a milestone, and prunes older rows`
3. `auto director replan notice audit records a reminder instead of an auto-approved wording`
4. `auto director auto-approval audit loads the latest 10 records per novel`

---

## 2. 目标与范围

### 2.1 目标

1. 批量模式下 19/19 测试全部通过
2. 每个测试文件的 prisma mock 在 teardown 时完整恢复

### 2.2 In Scope

- `server/tests/autoDirector*.test.js` 相关测试文件

### 2.3 Out of Scope

- 测试框架迁移
- 非 auto-director 测试

---

## 3. 验收标准

- [ ] `pnpm test` 批量运行通过率 100%
- [ ] 单个文件运行仍然通过

---

## 4. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-28 | 创建 | 健康检查报告触发 |
