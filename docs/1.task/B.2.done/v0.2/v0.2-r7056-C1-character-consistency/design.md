---
description: "REQ-7056: 跨章节人物一致性 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7056: 范章人物一致性 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/` 下新增 CharacterConsistency 服务模块，负责角色状态维护和矛盾检测。

```
调用链路：
章节生成完成 → CharacterConsistencyService
  ↓
更新CharacterState（各章节状态）
  ↓
矛盾检测（LLM结构化分析）
  ↓
生成矛盾报告 + 一致性评分
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/characterConsistency/types.ts

export interface CharacterState {
  id: string;
  novelId: string;
  characterId: string;
  chapterNumber: number;
  appearance: AppearanceState;
  personality: PersonalityState;
  abilities: AbilityState[];
  relationships: RelationshipState[];
  currentStatus: string;
  location: string;
  sourceChapter: number;
  createdAt: Date;
}

export interface AppearanceState {
  height?: string;
  build?: string;
  hair?: string;
  eyes?: string;
  skin?: string;
  distinguishingFeatures?: string[];
  clothing?: string;
  rawDescription: string;
}

export interface PersonalityState {
  traits: string[];           // ['勇敢', '冲动', '忠诚']
  motivations: string[];      // ['复仇', '保护家人']
  fears: string[];
  speechPattern?: string;
  rawDescription: string;
}

export interface AbilityState {
  name: string;
  level: string;             // '初学', '精通', '大师'
  limitations?: string[];
  sourceChapter: number;
}

export interface RelationshipState {
  targetCharacterId: string;
  targetCharacterName: string;
  type: string;              // '朋友', '敌人', '恋人', '师徒'
  trustLevel?: number;       // 0-100
  rawDescription: string;
}
```

```typescript
// 新增文件：server/src/services/characterConsistency/detector.ts

export interface Contradiction {
  id: string;
  characterId: string;
  characterName: string;
  type: ContradictionType;   // 'appearance' | 'personality' | 'ability' | 'relationship' | 'location'
  severity: 'hard' | 'soft'; // 硬矛盾（直接冲突）| 软矛盾（模糊不一致）
  description: string;
  existingState: string;     // 已有状态描述
  newState: string;          // 新章节中的描述
  chapterNumber: number;
  suggestion?: string;       // 修复建议
  confidence: number;        // 0-1 检测置信度
}

export type ContradictionType = 'appearance' | 'personality' | 'ability' | 'relationship' | 'location';

export interface ConsistencyScore {
  chapterNumber: number;
  overall: number;           // 0-100
  dimensions: {
    appearance: number;
    personality: number;
    ability: number;
    relationship: number;
  };
  contradictions: Contradiction[];
}
```

## 2. 详细设计

### 2.1 CharacterState更新流程

```typescript
class CharacterConsistencyService {
  async updateCharacterStates(
    novelId: string,
    chapterNumber: number,
    chapterContent: string,
    characters: Character[]
  ): Promise<CharacterState[]> {
    const states: CharacterState[] = [];

    for (const character of characters) {
      const previousState = await this.getLatestState(novelId, character.id);
      const newState = await this.extractCharacterState(
        character,
        chapterContent,
        previousState,
        chapterNumber
      );
      states.push(newState);
    }

    return states;
  }

  private async extractCharacterState(
    character: Character,
    chapterContent: string,
    previousState: CharacterState | null,
    chapterNumber: number
  ): Promise<CharacterState> {
    // 使用LLM结构化输出提取角色状态
    const extracted = await invokeStructuredLlm(
      CHARACTERS_STATE_EXTRACTION_PROMPT,
      { character, chapterContent, previousState },
      CharacterStateSchema
    );

    return {
      ...extracted,
      characterId: character.id,
      chapterNumber,
      sourceChapter: chapterNumber,
    };
  }
}
```

### 2.2 矛盾检测算法

```typescript
class ContradictionDetector {
  async detect(
    novelId: string,
    chapterNumber: number,
    newStates: CharacterState[]
  ): Promise<Contradiction[]> {
    const contradictions: Contradiction[] = [];

    for (const newState of newStates) {
      const historicalStates = await this.getHistoricalStates(
        novelId,
        newState.characterId,
        chapterNumber
      );

      // 规则检测（快速、准确）
      const ruleContradictions = this.detectByRules(newState, historicalStates);
      contradictions.push(...ruleContradictions);

      // LLM检测（深层、语义）
      const llmContradictions = await this.detectByLLM(newState, historicalStates);
      contradictions.push(...llmContradictions);
    }

    return contradictions;
  }

  private detectByRules(
    newState: CharacterState,
    historicalStates: CharacterState[]
  ): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // 外貌硬矛盾检测（身高、体型等数值型）
    // 性格矛盾检测（相反特质）
    // 位置矛盾检测（不可能同时在两处）

    return contradictions;
  }

  private async detectByLLM(
    newState: CharacterState,
    historicalStates: CharacterState[]
  ): Promise<Contradiction[]> {
    // 使用LLM进行语义级别的矛盾检测
    const result = await invokeStructuredLlm(
      CONTRADICTION_DETECTION_PROMPT,
      { newState, historicalStates },
      ContradictionDetectionSchema
    );

    return result.contradictions;
  }
}
```

### 2.3 一致性评分计算

```typescript
class ConsistencyScorer {
  calculateScore(
    contradictions: Contradiction[],
    characterCount: number
  ): ConsistencyScore {
    const scores = {
      appearance: 100,
      personality: 100,
      ability: 100,
      relationship: 100,
    };

    for (const c of contradictions) {
      const penalty = c.severity === 'hard' ? 20 : 10;
      scores[c.type] = Math.max(0, scores[c.type] - penalty);
    }

    const overall = Math.round(
      (scores.appearance + scores.personality + scores.ability + scores.relationship) / 4
    );

    return {
      chapterNumber: contradictions[0]?.chapterNumber ?? 0,
      overall,
      dimensions: scores,
      contradictions,
    };
  }
}
```

## 3. 数据模型

### 3.1 数据库表

```sql
-- 角色状态历史表
CREATE TABLE character_states (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id),
  character_id TEXT NOT NULL REFERENCES characters(id),
  chapter_number INTEGER NOT NULL,
  appearance TEXT,           -- JSON
  personality TEXT,          -- JSON
  abilities TEXT,            -- JSON
  relationships TEXT,        -- JSON
  current_status TEXT,
  location TEXT,
  source_chapter INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 矛盾记录表
CREATE TABLE contradictions (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id),
  chapter_number INTEGER NOT NULL,
  character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  existing_state TEXT,
  new_state TEXT,
  suggestion TEXT,
  confidence REAL DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 一致性评分表
CREATE TABLE consistency_scores (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id),
  chapter_number INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  appearance_score INTEGER,
  personality_score INTEGER,
  ability_score INTEGER,
  relationship_score INTEGER,
  contradiction_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 接口设计

### 4.1 内部接口

```typescript
// 服务接口
export interface CharacterConsistencyService {
  updateCharacterStates(novelId: string, chapterNumber: number, content: string, characters: Character[]): Promise<CharacterState[]>;
  detectContradictions(novelId: string, chapterNumber: number, states: CharacterState[]): Promise<Contradiction[]>;
  getConsistencyScore(novelId: string, chapterNumber: number): Promise<ConsistencyScore>;
  getContradictions(novelId: string, filter?: ContradictionFilter): Promise<Contradiction[]>;
  getCharacterHistory(novelId: string, characterId: string): Promise<CharacterState[]>;
}
```

### 4.2 REST API

```
GET  /api/novels/:novelId/characters/:characterId/states  - 查询角色状态历史
GET  /api/novels/:novelId/contradictions                  - 查询矛盾列表
GET  /api/novels/:novelId/chapters/:chapterNumber/consistency - 查询章节一致性评分
POST /api/novels/:novelId/contradictions/:contradictionId/resolve - 标记矛盾已解决
```

## 5. 实现步骤

### Phase 1: 数据模型和角色状态提取（0.5天）

1. 创建数据库迁移
2. 实现CharacterState提取（LLM结构化输出）
3. 实现状态存储和查询

### Phase 2: 矛盾检测（0.5天）

1. 实现规则检测（硬矛盾）
2. 实现LLM检测（语义矛盾）
3. 实现矛盾报告生成

### Phase 3: 评分和集成（0.3天）

1. 实现一致性评分计算
2. 集成到章节生成流程（后台异步）
3. REST API实现

### Phase 4: 测试（0.2天）

1. 单元测试：状态提取、矛盾检测、评分计算
2. 集成测试：完整流程
3. 准确率验证：人工标注测试集

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| LLM检测不准确 | 误报漏报 | 中 | 规则+LLM双层检测+人工复核 |
| 性能影响 | 章节生成变慢 | 低 | 异步后台执行 |
| 状态提取遗漏 | 矛盾漏检 | 中 | 多维度提取+增量更新 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('CharacterStateExtractor', () => {
  it('should extract appearance from chapter content');
  it('should extract personality traits');
  it('should extract relationships');
});

describe('ContradictionDetector', () => {
  it('should detect hard contradiction (appearance conflict)');
  it('should detect soft contradiction (personality drift)');
  it('should not flag consistent states');
});

describe('ConsistencyScorer', () => {
  it('should calculate score correctly');
  it('should penalize hard contradictions more');
});
```

### 7.2 准确率验证

```
测试集：人工标注的矛盾案例
目标：硬矛盾准确率>90%，软矛盾准确率>70%
方法：对比LLM检测结果与人工标注
```

## 8. 交付物

- [ ] `server/src/services/characterConsistency/` - 服务目录
- [ ] 数据库迁移文件
- [ ] CharacterState提取和存储
- [ ] 矛盾检测逻辑
- [ ] 一致性评分计算
- [ ] REST API端点
- [ ] 单元测试和集成测试
