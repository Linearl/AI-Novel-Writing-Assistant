---
description: "REQ-2001 方案设计"
---

# REQ-2001 方案设计

## 1. 方案概述

采用"客户端解析预览 + 服务端批量写入"的分层架构。客户端负责文件读取、结构校验、basic scope 表单回填；服务端负责创建新书后的非 basic scope 数据持久化。导入格式限定为 JSON（与导出模块的 `NovelExportBundle` 对齐），不做 TXT/Markdown 的逆向解析。

### 1.1 设计目标

1. 用户在创建新书页面上传 JSON → 预览 → 确认 → 表单回填 → 创建新书 → 后台写入深层数据
2. 导入是导出的逆过程，复用 `NovelExportBundle` 类型，不引入新的外部格式
3. 所有导入实体生成新 ID，维护新旧映射，避免跨书 ID 冲突

### 1.2 关键决策

1. **basic scope 在客户端回填**：basic 数据直接映射到表单状态，用户可在提交前二次编辑，无需额外 API 调用
2. **非 basic scope 在服务端批量写入**：涉及多个表的事务写入，放在服务端保证一致性
3. **单端点 + scope 参数**：`POST /api/novels/:id/import` 接收 scope 数组，一个端点覆盖所有非 basic scope
4. **不做增量合并**：首版仅支持"新建空书 + 导入"，不处理已有数据的冲突

### 1.3 不在范围

- TXT / Markdown 导入
- 增量合并 / 冲突检测
- 跨版本 schema 兼容

## 2. 实现细节

### 2.1 前端

#### 2.1.1 新组件：`ImportFromFileDialog`

位置：`client/src/pages/novels/components/import/ImportFromFileDialog.tsx`

职责：
- 文件选择器（accept `.json`）
- 客户端解析 + 校验 `NovelExportBundle` 结构
- 展示导入预览（原书名、导出时间、scope 列表及数据摘要）
- scope 勾选面板（默认全选有数据的 scope，即全量导入；用户可逐项取消或使用快捷按钮筛选）
- 确认导入后回调 `{ basicPatch, scopes, rawBundle }`

状态机：
```
idle → file_selected → parsing → preview → confirming → done
                        ↓
                      error (显示错误信息, 可重新选择)
```

#### 2.1.2 表单回填映射

新建工具函数：`client/src/pages/novels/import/basicScopeToFormPatch.ts`

```typescript
function basicScopeToFormPatch(
  basic: NovelExportBasicSection
): Partial<NovelBasicFormState>
```

映射规则见 REQ-2001 §3.5。特殊处理：
- `commercialTags` 数组 → `commercialTagsText` 逗号分隔字符串
- `worldId` → 置空，需用户手动选择
- 缺失字段保留默认值（不覆盖为 null/undefined）

#### 2.1.3 NovelCreate 页面集成

修改 `NovelCreate.tsx`：
- 在 `CardHeader` 下方增加 `ImportFromFileDialog` 的触发入口
- 导入确认后调用 `setBasicForm(prev => patchNovelBasicForm(prev, basicPatch))` 回填表单
- 将 `rawBundle` 和选中的 `scopes` 存入组件 state
- 在 `createNovelMutation.onSuccess` 中，若存在待导入的非 basic scope，调用导入 API

#### 2.1.4 导入结果展示

新建组件：`client/src/pages/novels/components/import/ImportResultPanel.tsx`

在新书创建成功并完成非 basic scope 导入后，以 Toast 或内联面板展示每个 scope 的导入结果（success/skipped/failed）。

### 2.2 后端

#### 2.2.1 新模块：`server/src/modules/import/`

目录结构：
```
server/src/modules/import/
├── index.ts                    # 模块 facade
├── novelImport.types.ts        # 导入请求/响应类型
├── novelImport.service.ts      # 核心导入服务
├── novelImport.mappers.ts      # ExportDTO → CreateInput 映射
├── http/
│   └── novelImport.ts          # Express 路由
└── README.md                   # 模块说明
```

#### 2.2.2 API 端点

**`POST /api/novels/:id/import`**

请求体：
```typescript
interface NovelImportRequest {
  scopes: NovelExportSectionScope[];  // 要导入的 scope 列表
  data: Partial<NovelExportSectionMap>;  // 对应的 section 数据
}
```

响应体：
```typescript
interface NovelImportResponse {
  results: Array<{
    scope: NovelExportSectionScope;
    status: "success" | "skipped" | "failed";
    detail?: string;
    imported?: { created: number; skipped: number };
  }>;
}
```

校验：
- `novelId` 必须存在
- `scopes` 非空
- 每个 scope 在 `data` 中必须有对应数据

#### 2.2.3 `novelImport.service.ts` 核心逻辑

```typescript
class NovelImportService {
  async importScopes(novelId: string, request: NovelImportRequest): Promise<NovelImportResponse>
}
```

逐 scope 处理，每个 scope 独立 try-catch：

- **`story_macro`**：调用现有 storyMacroService 写入 `StoryMacroPlan` 和 `BookContract`
- **`character`**：遍历 `sections.character.characters`，为每个 character 生成新 ID（`crypto.randomUUID()`），写入 Character 表；遍历 `relations`，用 ID 映射替换 characterId；遍历 `castOptions`，重新关联
- **`outline` / `structured`**：将 `sections.outline.workspace` 写入 VolumeWorkspace
- **`chapter`**：遍历 chapters 生成新 ID，写入 Chapter 表；遍历 chapterPlans 用 ID 映射替换 chapterId
- **`pipeline`**：仅写入 `NovelBible` 和 `PlotBeat`（新 ID）；跳过 `PipelineJob`、`StateSnapshot`、`QualityReport`

#### 2.2.4 `novelImport.mappers.ts`

负责将 `NovelExportSectionMap` 中的各 section DTO 转换为 Prisma `create` 所需的输入类型。关键职责：
- 剥离 `id`、`createdAt`、`updatedAt` 等服务端生成字段
- 维护 `oldId → newId` 映射（`Map<string, string>`）
- 处理外键引用替换

### 2.3 共享

#### 2.3.1 新增 `shared/types/novelImport.ts`

```typescript
export interface NovelImportRequest {
  scopes: NovelExportSectionScope[];
  data: Partial<NovelExportSectionMap>;
}

export interface NovelImportScopeResult {
  scope: NovelExportSectionScope;
  status: "success" | "skipped" | "failed";
  detail?: string;
  imported?: { created: number; skipped: number };
}

export interface NovelImportResponse {
  results: NovelImportScopeResult[];
}
```

#### 2.3.2 新增客户端校验工具

`shared/types/novelImport.ts` 中增加：

```typescript
export function isValidExportBundle(data: unknown): data is NovelExportBundle
export function summarizeExportBundle(bundle: NovelExportBundle): ExportBundleSummary
```

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 | Content-Type |
| ---- | ---- | ---- | ------------ |
| POST | `/api/novels/:id/import` | 向已有新书导入 scope 数据 | `application/json` |

### 3.2 请求示例

```json
{
  "scopes": ["character", "outline"],
  "data": {
    "character": {
      "characters": [...],
      "relations": [...],
      "castOptions": [...],
      "timelines": [...]
    },
    "outline": {
      "workspace": { ... }
    }
  }
}
```

### 3.3 响应示例

```json
{
  "results": [
    { "scope": "character", "status": "success", "imported": { "created": 5, "skipped": 0 } },
    { "scope": "outline", "status": "success", "imported": { "created": 1, "skipped": 0 } }
  ]
}
```

## 4. 数据模型

无数据库 schema 变更。导入数据完全复用现有 Prisma 模型，只是通过 service 层批量写入。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | scopes 为空或 data 缺失对应 section | 返回错误信息 |
| 404 | novelId 不存在 | 返回 404 |
| 422 | section 数据结构不合法 | 跳过该 scope，在 results 中报告 failed |
| 500 | 数据库写入异常 | 跳过该 scope，事务回滚该 scope 的部分写入 |

## 6. 验证策略

1. 用现有导出功能生成测试 JSON 文件（full scope）
2. 创建新书 → 上传该 JSON → 验证 basic scope 表单回填正确
3. 提交创建 → 验证非 basic scope 数据写入数据库
4. 对比原书和新导入书的数据一致性（角色数、章节数、大纲内容）
5. 测试边界情况：空 section、畸形 JSON、超大文件
