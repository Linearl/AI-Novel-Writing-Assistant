---
description: "支持 MiniMax 图像生成 API - 用于生成小说封面"
id: REQ-2024
title: 支持 MiniMax 图像生成
version: 0.1
status: in_progress
priority: p2
complexity: medium
created: 2026-06-29
updated: 2026-06-29
tags:
  - image-generation
  - minimax
  - novel-cover
related_requirements:
  - REQ-2004  # Creative Hub Agent 执行可观测性增强
---

# REQ-2024: 支持 MiniMax 图像生成

## 1. 问题背景

当前图像生成仅支持 OpenAI 兼容的 API 格式。用户使用 MiniMax 作为 LLM Provider，但 MiniMax 的图像生成 API 使用不同的端点和请求格式：

**OpenAI 格式**:
- 端点: `/images/generations`
- 参数: `model`, `prompt`, `n`, `size`

**MiniMax 格式**:
- 端点: `/v1/image_generation`
- 参数: `model`, `prompt`, `n`, `aspect_ratio`, `response_format`

## 2. 目标

支持 MiniMax 的图像生成 API，让用户可以使用 MiniMax 生成小说封面。

## 3. 范围

### 包含
- 修改 `buildImageGenerationRequestBody` 支持 MiniMax 格式
- 修改 `generateImagesByProvider` 支持 MiniMax 端点
- 修改 `parseImagesFromPayload` 支持 MiniMax 响应格式
- 支持 MiniMax 特有的参数（`aspect_ratio`, `style`, `prompt_optimizer`）

### 不包含
- MiniMax 其他功能（视频、语音、音乐）
- 图像编辑功能（仅文生图）

## 4. 非目标

- 不修改现有 OpenAI 兼容格式
- 不影响其他 Provider 的图像生成

## 5. EARS 验收条目

| ID | 验收条件 | 优先级 |
|----|----------|--------|
| AC-1 | 用户选择 MiniMax Provider 时，使用 `/v1/image_generation` 端点 | Must |
| AC-2 | 请求体包含 MiniMax 特有的 `aspect_ratio` 参数 | Must |
| AC-3 | 响应解析支持 MiniMax 的 `data.image_urls` 格式 | Must |
| AC-4 | 支持 MiniMax 的 `style` 参数（画风设置） | Should |
| AC-5 | 支持 MiniMax 的 `prompt_optimizer` 参数 | Could |

## 6. 风险与未决项

| 类型 | 描述 | 状态 |
|------|------|------|
| 风险 | MiniMax API 可能有内容审核限制 | 待验证 |
| 未决 | MiniMax 的错误码处理 | 需设计确认 |

## 7. 关联任务包

- REQ-2004: Creative Hub Agent 执行可观测性增强
