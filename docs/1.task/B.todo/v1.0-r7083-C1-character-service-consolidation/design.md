# 设计文档 — REQ-7083 Character Service Consolidation

## 1. 现状分析

### 1.1 七大角色目录

| 目录 | 文件数 | 核心职责 |
|------|--------|----------|
| `services/character/` | 5 | 基础 CRUD + 库同步 + 生成 |
| `services/novel/characters/` | 2 | 角色弧线 + 硬事实 |
| `services/novel/characterPrep/` | 6 | 阵容准备/生成/质量 |
| `services/novel/characterProfile/` | 1 | 可见画像 |
| `services/novel/characterResource/` | 4 | 资源提取/验证/台账 |
| `services/novel/characterExit/` | 少量 | 退场推断 |
| `services/characterConsistency/` | 少量 | 一致性检测 |

### 1.2 序列化碎片化

11 个文件各自实现角色数据格式转换（Prisma model → DTO、API 响应 → 内部模型等），无统一 CharacterMapper。每个文件独立定义字段映射逻辑，导致：
- 同一字段在多处重复映射，修改时容易遗漏
- 映射逻辑不一致（如某些地方遗漏 nullable 字段处理）
- 新增字段需要同步修改多个文件的序列化代码

### 1.3 Prompt Governance 违规

角色相关代码包含 23 处内联 prompt，分布在：
- `characterPreparationSupplemental.ts`：13 处（最严重）
- 其他角色文件：10 处

## 2. 目标架构

```
services/character/
├── index.ts                           ← facade 导出
├── CharacterDomainService.ts          ← 统一入口，组合各子模块
├── CharacterMapper.ts                 ← 统一序列化/DTO
├── preparation/                       ← 原 characterPrep/ (6文件)
│   ├── index.ts
│   ├── characterPreparationService.ts
│   ├── characterPreparationSupplemental.ts
│   └── ...
├── resource/                          ← 原 characterResource/ (4文件)
│   ├── index.ts
│   ├── characterResourceService.ts
│   └── ...
├── consistency/                       ← 原 characterConsistency/
│   └── index.ts
├── profile/                           ← 原 characterProfile/
│   └── index.ts
├── arc/                               ← 原 novel/characters/
│   ├── index.ts
│   ├── characterArcService.ts
│   └── characterHardFactsService.ts
└── exit/                              ← 原 characterExit/
    └── index.ts
```

## 3. CharacterDomainService 接口设计

```typescript
// CharacterDomainService — 角色领域服务统一入口
// 组合各子模块，对外暴露统一接口

export interface ICharacterDomainService {
  // --- 基础 CRUD（整合原 services/character/） ---
  createCharacter(novelId: string, input: CreateCharacterInput): Promise<CharacterDTO>;
  getCharacter(characterId: string): Promise<CharacterDTO>;
  updateCharacter(characterId: string, input: UpdateCharacterInput): Promise<CharacterDTO>;
  deleteCharacter(characterId: string): Promise<void>;
  listCharacters(novelId: string): Promise<CharacterDTO[]>;
  syncFromLibrary(characterId: string): Promise<CharacterDTO>;

  // --- 准备与生成 ---
  prepareRoster(novelId: string, input: RosterPreparationInput): Promise<RosterDTO>;
  generateCharacter(novelId: string, input: CharacterGenerationInput): Promise<CharacterDTO>;

  // --- 资源管理 ---
  extractResources(characterId: string): Promise<ResourceDTO[]>;
  validateResources(characterId: string): Promise<ValidationResult>;

  // --- 画像 ---
  getProfile(characterId: string): Promise<CharacterProfileDTO>;

  // --- 弧线 ---
  getArc(characterId: string): Promise<CharacterArcDTO>;
  getHardFacts(characterId: string): Promise<HardFactsDTO>;

  // --- 一致性 ---
  checkConsistency(characterId: string): Promise<ConsistencyResult>;

  // --- 退场 ---
  inferExit(characterId: string, context: ExitContext): Promise<ExitInferenceDTO>;
}
```

## 4. CharacterMapper 字段映射

### 4.1 核心 DTO 映射

```typescript
// CharacterMapper — 统一角色数据序列化/DTO

export class CharacterMapper {
  // Prisma Character → CharacterDTO
  static toDTO(prisma: PrismaCharacter): CharacterDTO;

  // CreateCharacterInput → Prisma CharacterCreateInput
  static toPrismaCreate(input: CreateCharacterInput): Prisma.CharacterCreateInput;

  // UpdateCharacterInput → Prisma CharacterUpdateInput
  static toPrismaUpdate(input: UpdateCharacterInput): Prisma.CharacterUpdateInput;

  // API 响应 → 内部模型
  static fromAPIResponse(response: CharacterAPIResponse): CharacterInternal;

  // 内部模型 → API 响应
  static toAPIResponse(internal: CharacterInternal): CharacterAPIResponse;
}
```

### 4.2 子模块专用映射扩展

```typescript
// CharacterMapper 扩展 — 子模块专用
export namespace CharacterMapper {
  // 准备阶段专用
  export function toRosterDTO(prepData: PreparationData): RosterDTO;
  export function fromGenerationResult(result: GenerationResult): CharacterDTO;

  // 资源专用
  export function toResourceDTO(resourceData: ResourceData): ResourceDTO;
  export function fromExtractedData(data: ExtractedData): ResourceDTO[];

  // 画像专用
  export function toProfileDTO(profileData: ProfileData): CharacterProfileDTO;

  // 弧线专用
  export function toArcDTO(arcData: ArcData): CharacterArcDTO;

  // 退场专用
  export function toExitDTO(exitData: ExitData): ExitInferenceDTO;
}
```

## 5. 迁移步骤

### 5.1 迁移顺序（关键路径）

```
阶段 1: 建立目录结构 + CharacterDomainService 骨架 + CharacterMapper 骨架
  ↓
阶段 2: 审计现有序列化实现 → 完善 CharacterMapper
  ↓
阶段 3: 逐子目录迁移（按依赖顺序）
  T5: preparation（最大模块，最先迁移）
  T6: resource
  T7: arc
  T8: profile
  T9: exit
  T10: consistency
  T11: 整合原 services/character/ 基础 CRUD
  ↓
阶段 4: 内联 prompt 迁移
  ↓
阶段 5: 全量导入路径更新
  ↓
阶段 6: 验证（typecheck + test + build）
```

### 5.2 每个子目录迁移流程

1. 创建目标子目录和 `index.ts`
2. 移动源文件到目标目录
3. 更新文件内部导入（相对路径）
4. 替换内联序列化调用为 CharacterMapper
5. 更新 `CharacterDomainService.ts` 导入
6. 运行 `pnpm typecheck`

## 6. 内联 Prompt 迁移策略

### 6.1 分类

| 类别 | 数量 | 目标 PromptAsset |
|------|------|-----------------|
| 角色生成 prompt | ~8 | `characterGeneration` |
| 阵容准备 prompt | ~5 | `rosterPreparation` |
| 画像描摹 prompt | ~4 | `characterProfile` |
| 退场推断 prompt | ~3 | `characterExit` |
| 一致性检测 prompt | ~3 | `characterConsistency` |

### 6.2 迁移方式

1. 为每类 prompt 创建 PromptAsset 文件（放在 `server/src/prompting/character/` 下）
2. 在 `prompting/registry.ts` 注册
3. 将内联 prompt 文本提取到 PromptAsset 的 `systemPrompt`/`userPrompt` 方法
4. 替换原内联调用为 `registry.get('characterGeneration').buildPrompt(input)`

## 7. 风险控制

| 风险 | 控制措施 |
|------|----------|
| 导入路径遗漏 | 每个子目录迁移后用 grep 验证旧路径零引用 |
| 序列化行为变更 | CharacterMapper 先提取现有逻辑的测试用例，确保行为等价 |
| prompt 语义变化 | 迁移时保持原文不变，仅改变存放位置和调用方式 |
| 并行开发冲突 | 迁移期间冻结其他角色相关 PR |
