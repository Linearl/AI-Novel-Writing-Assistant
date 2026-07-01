---
description: "REQ-2034 主题一致性LLM分析层（原始冻结副本）"
---

# REQ-2034 主题一致性 LLM 分析层 (Theme Consistency LLM Analysis)

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2034 |
| 优先级 | P2 |
| 来源 | REQ-2029 后续迭代 |
| 关联需求 | REQ-2033 |

---

## 1. 背景与问题

REQ-2033 纯数据工具只能做结构检查。主题偏移、母题断裂等语义级问题需要 LLM 辅助分析。

## 2. 目标与范围

新增 2 个 inspect tool + 1 个 PromptAsset：`analyze_theme_consistency`（主题偏移检测）、`analyze_motif_tracking`（母题持续性）。

## 3. 需求详情

见 REQ-2034.md 第 3 节。

## 4. 验收标准

- [ ] 2 个工具注册，category inspect，riskLevel medium
- [ ] PromptAsset 注册
- [ ] 类型检查 + 测试通过

## 5. 风险与约束

LLM 结果不稳定用 schema 约束，token 消耗用分批限制。

## 6. 关联与边界

依赖 REQ-2033。

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 创建 | 初始版本 |
