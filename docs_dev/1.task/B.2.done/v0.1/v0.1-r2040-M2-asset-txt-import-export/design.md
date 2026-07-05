---
description: "REQ-2040 资产 TXT 导入导出技术设计文档"
---

# REQ-2040 技术设计文档

## 1. 架构概述

### 1.1 系统架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Client (React)  │────▶│ Server (Express)  │────▶│ File System  │
│  各模块页面       │     │ 各模块 TXT        │     │ TXT 文件      │
│  导入/导出按钮    │     │ 导入/导出 endpoint │     └─────────────┘
└─────────────────┘     └──────────────────┘
```

### 1.2 目录结构

```
server/src/
├── modules/
│   ├── world/
│   │   └── http/
│   │       └── txtExport.ts      # 世界设定 TXT 导出/导入
│   ├── novel/
│   │   └── http/
│   │       ├── outlineTxtExport.ts  # 大纲 TXT 导出/导入
│   │       └── chapterTxtExport.ts  # 章节正文 TXT 导出
│   └── comic/                     # 关系网归属（视项目结构定）
├── services/
│   └── txt-io/
│       ├── settingsTxtSerializer.ts   # 设定序列化/反序列化
│       ├── outlineTxtSerializer.ts    # 大纲序列化/反序列化
│       ├── charactersTxtSerializer.ts # 关系网序列化/反序列化
│       └── chapterTxtSerializer.ts    # 正文纯文本处理
└── utils/
    └── txtParser.ts               # 通用 TXT 行解析工具
```

## 2. TXT 格式定义

### 2.1 设定 TXT（settings.txt）

**用途**: 世界设定字段的扁平化存储

**格式**:
```
字段名=字段值
字段名=字段值
```

**规则**:
- 每行一个字段，`=` 为分隔符
- 字段值中需要换行时使用 `\n` 字面文本（序列化时转义，反序列化时还原）
- 空行跳过
- 不支持字段值中包含 `=` 的原义（`=` 后的首个 `=` 作为值的一部分处理）

**示例**:
```
世界名称=九州大陆
时代背景=架空仙侠
灵气体系=五行灵气
金木水火土对应五座主峰
```

> 注：字段值含换行时，导出写为 `灵气体系=五行灵气\n金木水火土对应五座主峰`，即实际值内换行符转义为字面 `\n`。

### 2.2 大纲 TXT（outline.txt）

**用途**: 章节列表及其摘要

**格式**:
```
章节标题-----章节摘要
```

**规则**:
- 分隔符固定为 5 个减号 `-----`
- 空行跳过
- 章节标题或摘要中不应包含 `-----`（如存在，导出时转义为 `- - - - -`）

### 2.3 关系网 TXT（relationships.txt）

**用途**: 角色关系和基础档案

**格式**:
```
=== 角色档案 ===
林风=主角|男|18岁|孤儿
张雪=女配|女|19岁|白眉真人弟子

=== 关系 ===
林风|师徒|白眉真人|在世
林风|同门|张雪|友善
张雪|暗恋|林风|未表白
```

**规则**:
- 分为"角色档案"和"关系"两个区块，用 `=== 区块名 ===` 标识
- 角色档案：`角色名=属性1|属性2|属性3`
- 关系行：`角色名|关系类型|目标角色|状态`
- 状态字段可选，缺失时导入默认值为"未知"

### 2.4 正文 TXT（chapter.txt）

**用途**: 章节纯文本内容

**格式**: 纯文本，段落间空行分隔

**规则**:
- 无 markdown 格式标记（`#`、`*`、`-` 等标记去除）
- 段落之间保留一个空行
- 章节标题如存在，保留为单独一行

## 3. API 端点设计

### 3.1 导出端点（GET）

所有导出端点统一返回 `Content-Type: text/plain; charset=utf-8` + `Content-Disposition: attachment; filename=xxx.txt`。

**世界设定导出**:
```
GET /api/projects/:id/world/export/txt
Response: 200 text/plain (UTF-8)
Body: 按 settings.txt 格式的文本内容
```

**大纲导出**:
```
GET /api/projects/:id/outline/export/txt
Response: 200 text/plain (UTF-8)
Body: 按 outline.txt 格式的文本内容
```

**关系网导出**:
```
GET /api/projects/:id/characters/export/txt
Response: 200 text/plain (UTF-8)
Body: 按 relationships.txt 格式的文本内容
```

**章节正文导出**:
```
GET /api/projects/:id/chapters/:chapterId/export/txt
Response: 200 text/plain (UTF-8)
Body: 章节纯文本内容
```

### 3.2 导入端点（POST）

所有导入端点统一使用 `multipart/form-data` 或 `text/plain` body。

**世界设定导入**:
```
POST /api/projects/:id/world/import/txt
Content-Type: text/plain 或 multipart/form-data; field=txtFile
Body: settings.txt 格式的文本内容
Query: ?mode=overwrite|merge (默认 overwrite)
Response: { success: true, fieldsImported: number }
Error: 400 { error: "格式错误", line: N, detail: "..." }
```

**大纲导入**:
```
POST /api/projects/:id/outline/import/txt
Query: ?mode=overwrite|append
Response: { success: true, chaptersImported: number }
```

**关系网导入**:
```
POST /api/projects/:id/characters/import/txt
Query: ?mode=overwrite|merge
Response: { success: true, charactersImported: number, relationshipsImported: number }
```

## 4. 导入解析逻辑

### 4.1 通用解析流程

```
接收 TXT 内容
    ↓
UTF-8 解码（显式指定，防 BOM）
    ↓
按 \n 分割行
    ↓
去除 \r（兼容 Windows 换行）
    ↓
空行过滤
    ↓
按模块特定规则解析
    ↓
字段/结构校验
    ↓
写入数据库
```

### 4.2 错误处理

| 错误场景 | HTTP 状态码 | 响应格式 |
|---------|-----------|---------|
| 空文件 | 400 | `{ error: "文件内容为空" }` |
| 格式错误 | 400 | `{ error: "格式错误", line: N, detail: "缺少分隔符" }` |
| 编码错误 | 400 | `{ error: "文件编码不是 UTF-8" }` |
| 字段不合法 | 422 | `{ error: "未知字段", line: N, field: "xxx" }` |
| 数据库写入失败 | 500 | `{ error: "导入失败，请重试" }` |

### 4.3 幂等性

- 覆盖模式（overwrite）：先清空目标模块数据，再写入新数据
- 合并模式（merge）：保留已有数据，新增文件中的数据
- 追加模式（append，仅大纲）：在现有大纲末尾追加新章节

## 5. Client 交互设计

### 5.1 导出按钮

- 位置：各模块页面工具栏
- 样式：次级按钮（Secondary Button），带下载图标
- 交互：点击后直接触发浏览器文件下载（GET 请求，Content-Disposition 驱动）
- 文案：「导出 TXT」

### 5.2 导入按钮

- 位置：各模块页面工具栏
- 样式：次级按钮，带上传图标
- 交互：
  1. 点击后打开系统文件选择器（`.txt` 文件）
  2. 选择文件后弹出确认对话框（显示导入模式选择：覆盖/合并）
  3. 确认后上传文件，显示 loading 状态
  4. 成功后刷新当前模块数据并显示成功提示
  5. 失败时显示错误信息（含具体行号）
- 文案：「导入 TXT」

### 5.3 错误展示

- 导入失败时使用 Toast 提示，包含行号和具体原因
- 格式错误示例：「导入失败：第 3 行缺少分隔符 -----」

## 6. 测试策略

- **单元测试**：各 serializer 的序列化/反序列化逻辑
- **集成测试**：各 endpoint 的导出内容正确性、导入写入正确性
- **边界测试**：空文件、单行文件、超长字段值、特殊字符（含 `=`、`|`、`\n`）
- **端到端测试**：Client 按钮触发 → API 调用 → 文件下载/上传完整链路
