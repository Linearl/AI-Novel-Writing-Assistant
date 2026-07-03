---
description: "修复详情弹窗增强 - Token 统计、多版本 Tab、Diff 视图"
id: REQ-3006
title: 修复详情弹窗增强
version: 0.1
status: in_progress
priority: p2
complexity: medium
created: 2026-06-28
updated: 2026-06-28
tags:
  - ui
  - chapter-repair
  - token-usage
  - diff-view
related_requirements:
  - REQ-2015  # User Directed Chapter Repair
  - REQ-2021  # 质量修复阶段调试日志保存
---

# REQ-3006: 修复详情弹窗增强

## 1. 问题背景

当前修复详情弹窗功能简单，存在以下问题：
1. 用户无法实时了解修复消耗的 token 数
2. 修复过程中产生多个版本时，无法方便地切换查看
3. 修复完成后，无法在弹窗中对比新旧版本差异

## 2. 目标

增强修复详情弹窗，提供更好的修复过程可观测性和结果查看体验：
1. 标题栏实时显示 token 消耗（每 3s 刷新）
2. 多版本时动态生成子 tab
3. 修复完成后支持 diff 视图

## 3. 范围

### 包含
- Token 统计实时显示
- 多版本动态 Tab
- Diff 视图切换

### 不包含
- 修复流程本身的修改
- 新增修复类型

## 4. 非目标

- 不影响现有修复功能
- 不修改修复算法

## 5. EARS 验收条目

| ID | 验收条件 | 优先级 |
|----|----------|--------|
| AC-1 | 修复详情弹窗标题栏显示"Token: xxx"，每 3s 自动刷新 | Must |
| AC-2 | 修复过程中产生多个版本时，弹窗显示版本 Tab（版本 1、版本 2...） | Must |
| AC-3 | 点击 Tab 可切换查看对应版本的内容 | Must |
| AC-4 | 修复完成后，步骤 6 正文主窗口头部显示"查看 Diff"按钮 | Must |
| AC-5 | 点击"查看 Diff"按钮，弹窗切换到 diff 视图，对比新旧版本 | Must |
| AC-6 | "查看 Diff"按钮仅在修复完成后显示 | Should |
| AC-7 | Diff 视图清晰显示新增/删除/修改内容 | Should |

## 6. 风险与未决项

| 类型 | 描述 | 状态 |
|------|------|------|
| 风险 | Token 统计 API 可能不存在 | 待确认 |
| 未决 | Diff 视图使用哪个库 | 需设计确认 |

## 7. 关联任务包

- REQ-2015: User Directed Chapter Repair（基础功能）
- REQ-2021: 质量修复阶段调试日志保存（调试增强）
