---
description: "REQ-2024 技术设计文档"
id: REQ-2024
title: 支持 MiniMax 图像生成 - 技术设计
version: 0.1
created: 2026-06-29
---

# REQ-2024: 技术设计

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    ImageGenerationService                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  buildImageGenerationRequestBody()                  │   │
│  │  ├── OpenAI 格式: model, prompt, n, size            │   │
│  │  └── MiniMax 格式: model, prompt, n, aspect_ratio   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  generateImagesByProvider()                         │   │
│  │  ├── OpenAI: /images/generations                    │   │
│  │  └── MiniMax: /v1/image_generation                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  parseImagesFromPayload()                           │   │
│  │  ├── OpenAI: data[].url / data[].b64_json           │   │
│  │  └── MiniMax: data.image_urls[]                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据结构变更

### 2.1 MiniMax 请求格式

```typescript
{
  model: "image-01" | "image-01-live",
  prompt: string,
  aspect_ratio?: "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "3:4" | "9:16" | "21:9",
  style?: {
    style_type: "漫画" | "元气" | "中世纪" | "水彩",
    style_weight?: number,
  },
  response_format?: "url" | "base64",
  n?: number,
  seed?: number,
  prompt_optimizer?: boolean,
}
```

### 2.2 MiniMax 响应格式

```typescript
{
  id: string,
  data: {
    image_urls?: string[],
    image_base64?: string[],
  },
  metadata: {
    success_count: number,
    failed_count: number,
  },
  base_resp: {
    status_code: number,
    status_msg: string,
  }
}
```

## 3. API 变更

### 3.1 修改 buildImageGenerationRequestBody

```typescript
export function buildImageGenerationRequestBody(input: ImageProviderGenerateInput): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    model: input.model,
    prompt: buildPrompt(input.prompt, input.negativePrompt),
    n: input.count,
  };

  if (input.provider === "minimax") {
    // MiniMax 格式
    const aspectRatio = mapSizeToAspectRatio(input.size);
    if (aspectRatio) {
      requestBody.aspect_ratio = aspectRatio;
    }
    requestBody.response_format = "url";
    requestBody.prompt_optimizer = false;
  } else if (input.provider === "grok") {
    // Grok 格式
    const aspectRatio = mapSizeToAspectRatio(input.size);
    if (aspectRatio) {
      requestBody.aspect_ratio = aspectRatio;
    }
    requestBody.resolution = "1k";
  } else {
    // OpenAI 格式
    requestBody.size = input.size;
    // ... 其他参数
  }

  return requestBody;
}
```

### 3.2 修改 generateImagesByProvider

```typescript
export async function generateImagesByProvider(input: ImageProviderGenerateInput): Promise<ImageProviderGenerateResult> {
  // ...

  const baseURL = input.provider === "minimax"
    ? "https://api.minimaxi.com"
    : await resolveBaseURL(input.provider);

  const endpoint = input.provider === "minimax"
    ? "/v1/image_generation"
    : "/images/generations";

  const response = await fetch(`${baseURL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  // ...
}
```

### 3.3 修改 parseImagesFromPayload

```typescript
function parseImagesFromPayload(payload: unknown): Array<{
  url: string;
  mimeType?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}> {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return [];
  }

  const images: Array<{
    url: string;
    mimeType?: string;
    width?: number;
    height?: number;
    metadata?: Record<string, unknown>;
  }> = [];

  // OpenAI 格式: data[].url
  if (Array.isArray(data)) {
    for (const item of data) {
      // ... 现有逻辑
    }
  }
  // MiniMax 格式: data.image_urls[]
  else if ("image_urls" in data && Array.isArray(data.image_urls)) {
    for (const url of data.image_urls) {
      if (typeof url === "string" && url) {
        images.push({
          url,
          mimeType: "image/png",
          metadata: {},
        });
      }
    }
  }

  return images;
}
```

## 4. 错误处理

### MiniMax 错误码

| status_code | 含义 | 处理方式 |
|-------------|------|----------|
| 0 | 成功 | 正常处理 |
| 1002 | 限流 | 重试 |
| 1004 | 鉴权失败 | 提示用户检查 API Key |
| 1008 | 余额不足 | 提示用户充值 |
| 1026 | 敏感内容 | 提示用户修改 prompt |
| 2013 | 参数异常 | 检查入参 |
| 2049 | 无效 API Key | 提示用户检查 API Key |

## 5. 测试策略

| 测试类型 | 覆盖点 |
|----------|--------|
| 单元测试 | buildImageGenerationRequestBody MiniMax 格式 |
| 集成测试 | MiniMax API 调用 |
| E2E 测试 | 小说封面生成流程 |

## 6. 性能影响

- **无额外网络请求**：仅修改请求格式
- **响应解析**：MiniMax 格式更简单，解析更快
- **超时设置**：复用现有 imageGenerationConfig.httpTimeoutMs
