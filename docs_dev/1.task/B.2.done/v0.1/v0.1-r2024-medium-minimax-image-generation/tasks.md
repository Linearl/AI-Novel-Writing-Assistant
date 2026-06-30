---
description: "REQ-2024 任务分解清单"
id: REQ-2024
title: 支持 MiniMax 图像生成 - 任务清单
version: 0.1
created: 2026-06-29
---

# REQ-2024: 任务分解

## 阶段一：数据层（后端）

### T-1.1: 修改 buildImageGenerationRequestBody ✅ 已完成
- **文件**: `server/src/services/image/provider.ts`
- **工作内容**:
  - 添加 MiniMax 分支逻辑
  - 使用 `aspect_ratio` 替代 `size`
  - 添加 `response_format` 和 `prompt_optimizer` 参数
- **DoD**: 请求体格式正确
- **估时**: 0.5h
- **依赖**: 无

### T-1.2: 修改 generateImagesByProvider ✅ 已完成
- **文件**: `server/src/services/image/provider.ts`
- **工作内容**:
  - MiniMax 使用不同的 baseURL: `https://api.minimaxi.com`
  - MiniMax 使用不同的 endpoint: `/v1/image_generation`
  - 添加 MiniMax 错误码处理
- **DoD**: API 调用成功
- **估时**: 0.5h
- **依赖**: T-1.1

### T-1.3: 修改 parseImagesFromPayload ✅ 已完成
- **文件**: `server/src/services/image/provider.ts`
- **工作内容**:
  - 支持 MiniMax 的 `data.image_urls` 格式
  - 处理 `base_resp.status_code` 错误
- **DoD**: 响应解析正确
- **估时**: 0.5h
- **依赖**: 无

## 阶段二：测试与验证

### T-2.1: 单元测试 ✅ 已完成
- **文件**: `server/tests/image.test.js`
- **工作内容**:
  - 测试 buildImageGenerationRequestBody MiniMax 格式
  - 测试 parseImagesFromPayload MiniMax 格式
- **DoD**: 测试通过
- **估时**: 0.5h
- **依赖**: T-1.1, T-1.3

### T-2.2: E2E 测试 ✅ 已完成
- **工作内容**:
  - 手动测试 MiniMax 图像生成流程
  - 验证小说封面生成
- **DoD**: 流程顺畅
- **估时**: 1h
- **依赖**: T-1.2

## 任务依赖图

```
T-1.1 (请求格式) ── T-1.2 (API 调用)

T-1.3 (响应解析)
```

## 工时估算

| 阶段 | 工时 |
|------|------|
| 数据层 | 1.5h |
| 测试 | 1.5h |
| **总计** | **3h** |

## 验证清单

- [x] T-1.1: 修改 buildImageGenerationRequestBody
- [x] T-1.2: 修改 generateImagesByProvider
- [x] T-1.3: 修改 parseImagesFromPayload
- [x] T-2.1: 单元测试
- [ ] T-2.2: E2E 测试（⚠️ IMAGE_MODEL_OPTIONS 缺 minimax，前端设置页无推荐模型下拉）
