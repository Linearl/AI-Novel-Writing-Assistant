---
description: "REQ-7059: Prompt 模板系统 — 技术设计"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7059: Prompt 模板系统 — 技术设计

## 1. 架构设计

### 1.1 模板系统架构

```text
┌─────────────────────────────────────────────────────────┐
│                    调用方（章节生成等）                     │
│           runStructuredPrompt(promptId, context)         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  templateRuntime.ts (运行时)                             │
│  ├─ 检查小说是否有自定义覆盖                               │
│  ├─ 有覆盖 → 使用 PromptTemplateOverrideService 获取模板   │
│  ├─ 无覆盖 → 使用 officialTemplates 获取官方模板           │
│  └─ 调用 templateCompiler 编译                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  templateCompiler.ts (编译器)                            │
│  ├─ 解析 Token (context/input/slot)                      │
│  ├─ 替换 Token 为实际值                                   │
│  ├─ 生成 LangChain BaseMessage[]                         │
│  ├─ 生成编译诊断 (9 维度)                                 │
│  └─ 检查必需组约束                                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  officialTemplates.ts (官方模板)                          │
│  ├─ 存储官方模板 JSON                                     │
│  ├─ 提供版本号                                            │
│  └─ hash 校验                                            │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  PromptTemplateOverrideService.ts (覆盖服务)              │
│  ├─ CRUD: 创建/更新/删除覆盖                              │
│  ├─ 版本管理: 保存/列表/回滚                               │
│  ├─ 编译诊断: 检查模板完整性                               │
│  └─ Prisma: PromptTemplateOverride + PromptTemplateVersion│
└─────────────────────────────────────────────────────────┘
```

### 1.2 模板编译流程

```text
PromptTemplateJson
  │
  ├─ 遍历 messages[]
  │   ├─ 解析 Token: TOKEN_PATTERN 正则
  │   ├─ 分类: context.xxx → 上下文组
  │   │        input.xxx → 输入字段
  │   │        slot.xxx → Slot 值
  │   ├─ 替换 Token 为实际值
  │   └─ 构建 SystemMessage / HumanMessage
  │
  ├─ 收集诊断信息
  │   ├─ referencedContextGroups
  │   ├─ referencedInputFields
  │   ├─ referencedSlotKeys
  │   ├─ missingRequiredGroups (与 WRITER_REQUIRED_CONTEXT_GROUPS 对比)
  │   ├─ missingReferencedContextGroups
  │   ├─ missingInputFields
  │   ├─ unknownTokens
  │   └─ invalidMessages
  │
  └─ 返回 { messages: BaseMessage[], diagnostics: PromptTemplateDiagnostics }
```

### 1.3 版本化流程

```text
用户保存模板
  → PromptTemplateOverrideService.save()
  → assertPromptTemplateIsSavable() — 检查 blocking 诊断
  → 查找当前 override (按 scope + novelId + promptId)
  → 不存在 → 创建 Override + Version(v1)
  → 存在 → 创建新 Version(vN+1)
  → 更新 activeVersionId
  → 返回 VersionView

用户回滚
  → PromptTemplateOverrideService.restore()
  → 查找目标 Version
  → 更新 activeVersionId → 目标 Version.id
  → 返回更新后的 OverrideView
```

## 2. 详细设计

### 2.1 目录结构

```text
server/src/prompting/templates/
├── templateTypes.ts                    # 类型定义
├── templateCompiler.ts                 # 编译器（核心）
├── officialTemplates.ts                # 官方模板管理
├── PromptTemplateOverrideService.ts    # 覆盖 + 版本服务
└── templateRuntime.ts                  # 运行时集成
```

### 2.2 核心类型（templateTypes.ts）

```typescript
export const ADVANCED_TEMPLATE_PROMPT_ID = "novel.chapter.writer";
export const ADVANCED_TEMPLATE_SCOPE = "novel";
export const ADVANCED_TEMPLATE_MAX_CHARS = 60000;

export type PromptTemplateOverrideMode = "official" | "custom";
export type PromptTemplateMessageRole = "system" | "human";

export interface PromptTemplateMessage {
  role: PromptTemplateMessageRole;
  content: string;  // 含 Token 引用的模板文本
}

export interface PromptTemplateJson {
  kind: "chat";
  messages: PromptTemplateMessage[];
}

export interface PromptTemplateContextRefs {
  context: string[];  // 引用的上下文组
  input: string[];    // 引用的输入字段
  slot: string[];     // 引用的 Slot 键
}

export interface PromptTemplateDiagnostics {
  referencedContextGroups: string[];
  referencedInputFields: string[];
  referencedSlotKeys: string[];
  fallbackRequiredGroups: string[];
  missingRequiredGroups: string[];
  missingReferencedContextGroups: string[];
  missingInputFields: string[];
  unknownTokens: string[];
  invalidMessages: string[];
}

// 必需上下文组（不可移除）
export const WRITER_REQUIRED_CONTEXT_GROUPS = [
  "book_contract", "chapter_mission", "timeline_context",
  "previous_chapter_hook", "character_hard_facts", "obligation_contract",
  "volume_window", "participant_subset", "local_state", "style_contract",
] as const;
```

### 2.3 编译器实现要点（templateCompiler.ts）

```typescript
// Token 解析正则
const TOKEN_PATTERN = /\{\{\s*([^\s{}]+(?:\.[^\s{}]+)+)\s*\}\}/g;
// 匹配: {{ context.book_contract }}, {{ input.chapter_content }}, {{ slot.style_guide }}

// 编译函数签名
export function compilePromptTemplate(
  template: PromptTemplateJson,
  context: RenderContext,  // 包含 contextGroups, inputFields, slotValues
): {
  messages: BaseMessage[];
  diagnostics: PromptTemplateDiagnostics;
}

// 阻塞诊断检查
export function hasBlockingPromptTemplateDiagnostics(
  diagnostics: PromptTemplateDiagnostics,
): boolean {
  // missingRequiredGroups 或 invalidMessages 非空 → 阻塞
}

// 可保存性检查
export function assertPromptTemplateIsSavable(
  diagnostics: PromptTemplateDiagnostics,
): void {
  if (hasBlockingPromptTemplateDiagnostics(diagnostics)) {
    throw new Error("Template has blocking diagnostics");
  }
}
```

**上游参考**: `server/src/prompting/templates/templateCompiler.ts` — ~600 行，核心编译逻辑

### 2.4 覆盖服务实现要点（PromptTemplateOverrideService.ts）

```typescript
class PromptTemplateOverrideService {
  // 获取活跃模板（自定义或官方）
  async getActiveTemplate(novelId: string, promptId: string): Promise<{
    template: PromptTemplateJson;
    mode: PromptTemplateOverrideMode;
    version?: PromptTemplateVersionView;
  }>

  // 保存模板（创建新版本）
  async save(input: PromptTemplateSaveInput): Promise<PromptTemplateVersionView>

  // 回滚到指定版本
  async restore(input: PromptTemplateRestoreInput): Promise<PromptTemplateOverrideView>

  // 列出版本历史
  async listVersions(overrideId: string): Promise<PromptTemplateVersionView[]>

  // 切换覆盖模式
  async setMode(novelId: string, promptId: string, mode: PromptTemplateOverrideMode): Promise<void>
}
```

**上游参考**: `server/src/prompting/templates/PromptTemplateOverrideService.ts` — ~500 行

### 2.5 Prisma Schema

```prisma
model PromptTemplateOverride {
  id                String   @id @default(cuid())
  scope             String
  novelId           String
  promptId          String
  basePromptVersion String
  mode              String   @default("official")
  activeVersionId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  versions PromptTemplateVersion[]

  @@unique([scope, novelId, promptId])
  @@index([novelId])
}

model PromptTemplateVersion {
  id              String   @id @default(cuid())
  overrideId      String
  versionNo       Int
  templateJson    String
  contextRefsJson String
  compiledHash    String
  notes           String?
  createdAt       DateTime @default(now())

  override PromptTemplateOverride @relation(fields: [overrideId], references: [id])

  @@index([overrideId, versionNo])
}
```

## 3. 接口设计

### 3.1 HTTP API（可选，管理用）

```text
GET    /api/prompts/:promptId/template?novelId=xxx       # 获取活跃模板
PUT    /api/prompts/:promptId/template?novelId=xxx       # 保存模板（创建版本）
POST   /api/prompts/:promptId/template/restore           # 回滚
GET    /api/prompts/:promptId/template/versions?novelId=xxx  # 版本历史
PUT    /api/prompts/:promptId/template/mode               # 切换模式
POST   /api/prompts/:promptId/template/validate           # 编译诊断（不保存）
```

### 3.2 请求/响应格式

```typescript
// PUT /api/prompts/:promptId/template
interface SaveTemplateRequest {
  novelId: string;
  template: PromptTemplateJson;
  notes?: string;
}

interface SaveTemplateResponse {
  version: PromptTemplateVersionView;
  diagnostics: PromptTemplateDiagnostics;
  hasBlocking: boolean;
}

// GET /api/prompts/:promptId/template/versions
interface VersionListView {
  versions: PromptTemplateVersionView[];
  activeVersionId: string | null;
  mode: PromptTemplateOverrideMode;
}
```

## 4. 实现步骤

### Phase 1: Schema + 类型（0.5d）

1. 新增 2 个 Prisma 模型
2. 创建 templateTypes.ts 类型定义
3. 执行 prisma migrate dev

### Phase 2: 编译器（1d）

1. 实现 templateCompiler.ts（token 解析 + 诊断）
2. 实现编译诊断生成（9 维度）
3. 实现必需组约束检查
4. 实现 assertPromptTemplateIsSavable

### Phase 3: 官方模板（0.5d）

1. 实现 officialTemplates.ts
2. 迁移现有 PromptAsset 的模板为官方模板格式
3. 实现 hash 校验

### Phase 4: 覆盖服务（1d）

1. 实现 PromptTemplateOverrideService.ts
2. CRUD 操作
3. 版本管理（保存、列表、回滚）
4. 模式切换（official ↔ custom）

### Phase 5: 运行时集成（0.5d）

1. 实现 templateRuntime.ts
2. 集成到现有 runStructuredPrompt 流程
3. 测试端到端模板编译和执行

### Phase 6: 测试与验证（1d）

1. 单元测试 — 编译器（token 解析、诊断、约束）
2. 单元测试 — 覆盖服务（CRUD、版本、回滚）
3. 集成测试 — 完整流程（创建覆盖 → 编译 → 执行）
4. typecheck 验证

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 编译器 Token 解析边界情况 | Bug | 中 | 充分的单元测试覆盖 |
| 与现有 Slot 系统集成 | 冲突 | 中 | 适配层 + 集成测试 |
| 官方模板迁移 | 数据丢失 | 低 | 迁移脚本 + 备份 |
| 版本数据无上限 | 存储膨胀 | 低 | 后续添加清理策略 |

## 6. 交付物

- [ ] Prisma Schema 迁移文件（2 个新模型）
- [ ] `server/src/prompting/templates/templateTypes.ts`
- [ ] `server/src/prompting/templates/templateCompiler.ts`
- [ ] `server/src/prompting/templates/officialTemplates.ts`
- [ ] `server/src/prompting/templates/PromptTemplateOverrideService.ts`
- [ ] `server/src/prompting/templates/templateRuntime.ts`
- [ ] 单元测试文件
- [ ] 集成测试文件
