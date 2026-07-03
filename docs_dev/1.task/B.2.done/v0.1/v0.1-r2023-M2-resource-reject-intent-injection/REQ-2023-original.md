---
description: "资源变更风险拒绝意图注入 - 用户不接受风险时保存意图并在章节修复时注入"
id: REQ-2023
title: 资源变更风险拒绝意图注入
version: 0.1
status: in_progress
priority: p2
complexity: medium
created: 2026-06-28
updated: 2026-06-28
tags:
  - character-resource
  - risk-management
  - chapter-repair
  - user-intent
related_requirements:
  - REQ-2018  # 小说项目风险管理系统
---

# REQ-2023: 资源变更风险拒绝意图注入

## 1. 问题背景

当前资源变更风险处理只有两个选项：
- **确认并用于后续写作**（`confirm`）
- **忽略这条变化**（`reject`）

用户反馈：当用户不接受某个高风险变更时，需要重写章节来消除风险，但目前无法告诉 AI 用户的修正意图。

## 2. 目标

实现"不接受风险"功能，允许用户：
1. 表达不接受某条风险
2. 填写修正意图（告诉 AI 如何修正）
3. 在后续章节修复时，AI 自动读取并参考这些意图

## 3. 范围

### 包含
- UI 层：在 ResourceProposalCard 中添加"不接受此风险"按钮
- 数据层：在 proposal 中保存用户意图
- 业务层：在章节修复 prompt 中注入用户意图
- API 层：reject API 支持传入意图参数

### 不包含
- 自动重写功能（用户需手动触发重写）
- 批量拒绝功能（后续迭代）

## 4. 非目标

- 不修改现有 confirm/reject 的行为
- 不影响自动导演的正常流程

## 5. EARS 验收条目

| ID | 验收条件 | 优先级 |
|----|----------|--------|
| AC-1 | 用户点击"不接受此风险"后，弹出意图输入框 | Must |
| AC-2 | 用户填写意图后，proposal 状态变为 `rejected`，意图保存到 `rejectedIntent` 字段 | Must |
| AC-3 | 章节修复时，AI prompt 中包含该章节关联的 rejected proposals 的用户意图 | Must |
| AC-4 | 意图输入框支持可选填写（不填也可拒绝） | Should |
| AC-5 | 已拒绝的 proposal 在 UI 上显示用户意图 | Could |

## 6. 风险与未决项

| 类型 | 描述 | 状态 |
|------|------|------|
| 风险 | 意图注入可能影响 AI 修复质量 | 待验证 |
| 未决 | rejectedIntent 字段是否需要新增到 schema | 需设计确认 |

## 7. 关联任务包

- REQ-2018: 小说项目风险管理系统（基础）
