---
description: "配置厂商弹窗内新增手动拉取模型列表按钮"
id: REQ-2028
title: 配置厂商弹窗内手动拉取模型列表
version: 0.1
status: requirements_ready
priority: p3
complexity: simple
created: 2026-06-30
updated: 2026-06-30
tags:
  - settings
  - provider
  - model-list
  - ux
related_requirements:
  - REQ-2024
---

# REQ-2028: 配置厂商弹窗内手动拉取模型列表

## 1. 问题背景

当前配置厂商弹窗（ProviderConfigDialog）中，"获取模型列表"按钮仅在新增自定义厂商时显示。内置厂商（如 MiniMax、DeepSeek 等）的弹窗内没有手动拉取模型列表的入口。

用户修改 API Key 或 Base URL 后，需要关闭弹窗、回到厂商卡片点击"刷新模型"才能更新列表，操作路径断裂。

现有的"刷新模型"能力已完整：后端 `POST /settings/api-keys/:provider/refresh-models` API 和前端 `refreshModelsMutation` 均已就绪，只差弹窗内的触发入口。

## 2. 目标

在配置厂商弹窗的模型选择区域新增"拉取模型列表"按钮，与"测试连接"按钮同级，支持内置厂商和自定义厂商。

## 3. 范围

### 包含
- UI：ProviderConfigDialog 中模型选择区域新增"拉取模型列表"按钮
- 按钮显示条件：已配置 API Key 或 Base URL（有足够信息发起请求）
- 点击后调用已有的 `refreshProviderModelList` API，更新 `selectableModels`

### 不包含
- 新增后端 API（已有）
- 修改厂商卡片上的"刷新模型"按钮逻辑

## 4. 非目标

- 不修改自定义厂商的"获取模型列表"按钮行为
- 不修改后端刷新逻辑

## 5. EARS 验收条目

| ID | 验收条件 | 优先级 |
|----|----------|--------|
| AC-1 | 配置厂商弹窗内显示"拉取模型列表"按钮，位于模型选择区域 | Must |
| AC-2 | 点击后调用 refreshProviderModelList API，loading 状态正确 | Must |
| AC-3 | 成功后 selectableModels 更新，下拉列表刷新 | Must |
| AC-4 | 失败时显示错误提示 | Must |
| AC-5 | 与自定义厂商的"获取模型列表"按钮不冲突 | Should |

## 6. 风险与未决项

无。

## 7. 关联任务包

- REQ-2024: 支持 MiniMax 图像生成（本次需求的触发场景）
