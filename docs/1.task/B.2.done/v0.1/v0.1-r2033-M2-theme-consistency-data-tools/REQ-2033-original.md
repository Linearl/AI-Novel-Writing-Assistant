---
description: "REQ-2033 主题一致性纯数据工具层（原始冻结副本）"
---

# REQ-2033 主题一致性纯数据工具层 (Theme Consistency Data Tools)

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2033 |
| 优先级 | P2 |
| 来源 | REQ-2029 后续迭代 |
| 关联需求 | REQ-2034 |

---

## 1. 背景与问题

主题数据散布 8 个位置（Bible.mainPromise / BookContract / VolumePlan / PayoffLedgerItem 等），无工具聚合展示。伏笔失控无汇总，卷主题无覆盖检查，主题层级不可见。

## 2. 目标与范围

新增 3 个 inspect 类别 tool：`audit_payoff_health`、`audit_volume_theme_coverage`、`get_theme_hierarchy`。纯规则检查，无 LLM。

## 3. 需求详情

见 REQ-2033.md 第 3 节（3 个工具的输入输出规格）。

## 4. 验收标准

- [ ] 3 个工具注册且 category 为 inspect
- [ ] 类型检查 + 测试通过

## 5. 风险与约束

空数据返回空统计，不报错。

## 6. 关联与边界

REQ-2034 依赖本需求数据。

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 创建 | 初始版本 |
