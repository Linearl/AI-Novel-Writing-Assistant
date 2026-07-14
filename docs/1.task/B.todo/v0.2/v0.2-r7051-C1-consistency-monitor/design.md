---
description: "REQ-7051: 一致性实时监控 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7051: 一致性实时监控 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/services/novel/` 下新增一致性监控模块，监听章节生成完成事件，执行跨章节一致性检查。

```
事件流：
章节生成完成
  ↓
★ ConsistencyMonitor.check(chapterId)  // 异步一致性检查（新增）
  ↓
┌─────────────────────────────────────────────┐
│  TimelineChecker        → 时间线检查        │
│  CharacterBehaviorChecker → 人物行为检查    │
│  SpatialLogicChecker    → 空间逻辑检查      │
└─────────────────────────────────────────────┘
  ↓
ConsistencyReport（JSON）→ 存储 + 通知用户
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/novel/consistency/ConsistencyMonitor.ts

interface ConsistencyConfig {
  enabled: boolean;
  lookbackChapters: number;      // 回看章节数，默认3
  thresholds: {
    timeline: number;            // 时间线矛盾阈值
    character: number;           // 人物矛盾阈值
    spatial: number;             // 空间矛盾阈值
  };
  autoReport: boolean;           // 自动报告给用户
}

interface ConsistencyViolation {
  type: 'timeline' | 'character' | 'spatial';
  severity: 'error' | 'warning' | 'info';
  description: string;
  chapterIds: string[];          // 涉及的章节
  locations: Array<{
    chapterId: string;
    paragraph?: number;
    sentence?: number;
  }>;
  suggestion: string;
  evidence: string;              // 矛盾证据描述
}

interface ConsistencyReport {
  chapterId: string;
  checkedAt: string;
  violations: ConsistencyViolation[];
  overallPassed: boolean;
  summary: string;
  timelineData?: TimelineData;  // 时间线可视化数据
}

interface TimelineData {
  events: Array<{
    chapterId: string;
    description: string;
    timeReference: string;
    order: number;
  }>;
}
```

## 2. 详细设计

### 2.1 时间线检测器

```typescript
// server/src/services/novel/consistency/checkers/TimelineChecker.ts

class TimelineChecker {
  // 时间关键词模式
  private readonly TIME_PATTERNS = {
    dayMarkers: /第[一二三四五六七八九十\d]+天|次日|翌日|当天|那天|今天|明天|昨天/g,
    timeOfDay: /早上|上午|中午|下午|傍晚|晚上|深夜|凌晨|黄昏|黎明/g,
    seasonMarkers: /春天|夏天|秋天|冬天|春季|夏季|秋季|冬季/g,
    relativeTime: /过了[一二三四五六七八九十\d]+天|几天后|半个月后|一年后/g,
  };

  async check(
    currentChapter: ChapterContent,
    previousChapters: ChapterContent[]
  ): Promise<ConsistencyViolation[]> {
    const violations: ConsistencyViolation[] = [];

    // 提取当前章节的时间引用
    const currentTimeRefs = this.extractTimeReferences(currentChapter.content);

    // 提取前几章的时间引用
    const previousTimeRefs = previousChapters.flatMap(ch =>
      this.extractTimeReferences(ch.content).map(ref => ({
        ...ref,
        chapterId: ch.id,
      }))
    );

    // 检测时间顺序矛盾
    const orderViolations = this.checkTimeOrder(
      currentTimeRefs,
      previousTimeRefs,
      currentChapter.id
    );
    violations.push(...orderViolations);

    // 检测不合理的时间跳跃
    const jumpViolations = this.checkTimeJumps(
      currentTimeRefs,
      previousTimeRefs,
      currentChapter.id
    );
    violations.push(...jumpViolations);

    return violations;
  }

  private extractTimeReferences(content: string): TimeReference[] {
    const refs: TimeReference[] = [];

    for (const [type, pattern] of Object.entries(this.TIME_PATTERNS)) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        refs.push({
          type,
          text: match[0],
          position: match.index,
          normalizedTime: this.normalizeTime(match[0], type),
        });
      }
    }

    return refs.sort((a, b) => a.position - b.position);
  }

  private checkTimeOrder(
    currentRefs: TimeReference[],
    previousRefs: TimeReference[],
    chapterId: string
  ): ConsistencyViolation[] {
    const violations: ConsistencyViolation[] = [];

    // 获取前一章最后的时间引用
    const lastPrevRef = previousRefs[previousRefs.length - 1];
    const firstCurrentRef = currentRefs[0];

    if (lastPrevRef && firstCurrentRef) {
      // 检测时间是否回退
      if (firstCurrentRef.normalizedTime < lastPrevRef.normalizedTime) {
        violations.push({
          type: 'timeline',
          severity: 'warning',
          description: `时间回退：从 "${lastPrevRef.text}"（第${lastPrevRef.chapterId}章）回到 "${firstCurrentRef.text}"（第${chapterId}章）`,
          chapterIds: [lastPrevRef.chapterId, chapterId],
          locations: [
            { chapterId: lastPrevRef.chapterId },
            { chapterId, paragraph: this.getParagraphNumber(chapterId, firstCurrentRef.position) },
          ],
          suggestion: '检查时间线是否合理，或修正时间描述',
          evidence: `前章最后时间: ${lastPrevRef.text}, 本章开始时间: ${firstCurrentRef.text}`,
        });
      }
    }

    return violations;
  }

  private normalizeTime(text: string, type: string): number {
    // 简化的时间标准化，返回可比较的数值
    // 实际实现需要更复杂的中文时间解析
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
      '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    };

    if (type === 'dayMarkers') {
      const dayNum = text.match(/[一二三四五六七八九十\d]+/)?.[0] || '';
      return dayMap[dayNum] || parseInt(dayNum) || 0;
    }

    // 其他类型的时间标准化逻辑...
    return 0;
  }
}
```

### 2.2 人物行为检测器

```typescript
// server/src/services/novel/consistency/checkers/CharacterBehaviorChecker.ts

class CharacterBehaviorChecker {
  async check(
    currentChapter: ChapterContent,
    previousChapters: ChapterContent[],
    characters: Character[]
  ): Promise<ConsistencyViolation[]> {
    const violations: ConsistencyViolation[] = [];

    // 提取当前章节人物行为
    const currentBehaviors = this.extractBehaviors(
      currentChapter.content,
      characters
    );

    // 提取前几章人物行为历史
    const behaviorHistory = previousChapters.flatMap(ch =>
      this.extractBehaviors(ch.content, characters).map(b => ({
        ...b,
        chapterId: ch.id,
      }))
    );

    // 检测性格突变
    for (const behavior of currentBehaviors) {
      const history = behaviorHistory.filter(
        h => h.characterName === behavior.characterName
      );

      if (history.length > 0) {
        const突变 = this.detectPersonalityShift(behavior, history);
        if (突变) {
          violations.push({
            type: 'character',
            severity: 'warning',
            description: `人物 ${behavior.characterName} 性格突变：${突变.description}`,
            chapterIds: [突变.prevChapterId, currentChapter.id],
            locations: [
              { chapterId:突变.prevChapterId, paragraph:突变.paragraph },
              { chapterId: currentChapter.id, paragraph: behavior.paragraph },
            ],
            suggestion: `检查 ${behavior.characterName} 的行为是否符合其设定性格`,
            evidence: `前章行为: ${突变.prevBehavior}, 本章行为: ${behavior.description}`,
          });
        }
      }
    }

    return violations;
  }

  private extractBehaviors(
    content: string,
    characters: Character[]
  ): CharacterBehavior[] {
    const behaviors: CharacterBehavior[] = [];
    const paragraphs = content.split(/\n\n+/);

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      for (const char of characters) {
        // 检测该人物在本段中的行为
        const行为 = this.extractCharacterActions(para, char);
        if (行为) {
          behaviors.push({
            characterName: char.name,
            actions: 行为.actions,
            emotion: 行为.emotion,
            description: 行为.description,
            paragraph: i,
          });
        }
      }
    }

    return behaviors;
  }

  private detectPersonalityShift(
    current: CharacterBehavior,
    history: CharacterBehavior[]
  ): PersonalityShift | null {
    // 检测情绪变化是否合理
    const prevEmotions = history.map(h => h.emotion).filter(Boolean);
    const currentEmotion = current.emotion;

    if (prevEmotions.length > 0 && currentEmotion) {
      const lastEmotion = prevEmotions[prevEmotions.length - 1];
      // 简化的情绪矛盾检测
      if (this.isEmotionConflict(lastEmotion, currentEmotion)) {
        return {
          description: `从 ${lastEmotion} 突变为 ${currentEmotion}`,
          prevChapterId: history[history.length - 1].chapterId,
          prevBehavior: history[history.length - 1].description,
          prevParagraph: history[history.length - 1].paragraph,
        };
      }
    }

    return null;
  }
}
```

### 2.3 空间逻辑检测器

```typescript
// server/src/services/novel/consistency/checkers/SpatialLogicChecker.ts

class SpatialLogicChecker {
  // 空间关键词模式
  private readonly LOCATION_PATTERNS = {
    rooms: /房间|卧室|客厅|厨房|书房|浴室|办公室|教室/g,
    buildings: /大楼|大厦|别墅|公寓|酒店|医院|学校|公司/g,
    cities: /北京|上海|广州|深圳|杭州|成都|南京|武汉/g,
    directions: /东|南|西|北|左|右|前|后|上|下/g,
  };

  async check(
    currentChapter: ChapterContent,
    previousChapters: ChapterContent[]
  ): Promise<ConsistencyViolation[]> {
    const violations: ConsistencyViolation[] = [];

    // 提取当前章节的空间引用
    const currentLocations = this.extractLocations(currentChapter.content);

    // 提取前一章的空间上下文
    const prevContext = previousChapters.length > 0
      ? this.extractSpatialContext(previousChapters[previousChapters.length - 1].content)
      : null;

    if (prevContext) {
      // 检测人物位置跳跃
      const positionViolations = this.checkPositionContinuity(
        currentLocations,
        prevContext,
        currentChapter.id,
        previousChapters[previousChapters.length - 1].id
      );
      violations.push(...positionViolations);
    }

    return violations;
  }

  private checkPositionContinuity(
    current: LocationReference[],
    prevContext: SpatialContext,
    currentChapterId: string,
    prevChapterId: string
  ): ConsistencyViolation[] {
    const violations: ConsistencyViolation[] = [];

    // 检测主要人物是否在不同地点之间瞬间移动
    for (const loc of current) {
      if (loc.characterName && prevContext.characterPositions[loc.characterName]) {
        const prevPos = prevContext.characterPositions[loc.characterName];
        if (prevPos !== loc.place && !this.isReasonableTransition(prevPos, loc.place)) {
          violations.push({
            type: 'spatial',
            severity: 'warning',
            description: `人物 ${loc.characterName} 从 ${prevPos} 瞬间移动到 ${loc.place}，无过渡描述`,
            chapterIds: [prevChapterId, currentChapterId],
            locations: [
              { chapterId: prevChapterId },
              { chapterId: currentChapterId, paragraph: loc.paragraph },
            ],
            suggestion: `添加场景过渡描述，解释 ${loc.characterName} 如何从 ${prevPos} 到达 ${loc.place}`,
            evidence: `前章位置: ${prevPos}, 本章位置: ${loc.place}`,
          });
        }
      }
    }

    return violations;
  }
}
```

## 3. 数据模型

### 3.1 数据库表

```sql
CREATE TABLE ConsistencyViolation (
  id TEXT PRIMARY KEY,
  chapterId TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'timeline' | 'character' | 'spatial'
  severity TEXT NOT NULL,       -- 'error' | 'warning' | 'info'
  description TEXT NOT NULL,
  chapterIds JSON NOT NULL,     -- 涉及的章节ID列表
  locations JSON NOT NULL,      -- 具体位置信息
  suggestion TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'resolved' | 'ignored'
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt DATETIME,

  FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
);

CREATE INDEX idx_violation_chapter ON ConsistencyViolation(chapterId);
CREATE INDEX idx_violation_type ON ConsistencyViolation(type);
CREATE INDEX idx_violation_status ON ConsistencyViolation(status);
```

### 3.2 缓存模型

```typescript
interface SpatialContextCache {
  chapterId: string;
  characterPositions: Record<string, string>;  // 人物名 → 位置
  sceneDescriptions: string[];
  lastUpdated: string;
}

interface BehaviorHistoryCache {
  characterName: string;
  chapterId: string;
  emotion: string;
  actions: string[];
  personalityTraits: string[];
}
```

## 4. 接口设计

### 4.1 HTTP API

```typescript
// GET /api/novel/:novelId/consistency/report
// 查询小说整体一致性报告
Response: {
  totalViolations: number;
  openViolations: number;
  typeBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  recentViolations: ConsistencyViolation[];
}

// GET /api/novel/:novelId/chapters/:chapterId/consistency
// 查询章节相关的一致性问题
Response: ConsistencyViolation[]

// PUT /api/novel/consistency/violations/:violationId/resolve
// 标记问题为已解决
Body: { resolution?: string }
Response: ConsistencyViolation

// PUT /api/novel/consistency/violations/:violationId/ignore
// 忽略问题
Body: { reason?: string }
Response: ConsistencyViolation
```

### 4.2 内部接口

```typescript
// 一致性检查入口
export async function runConsistencyCheck(
  chapterId: string,
  config?: Partial<ConsistencyConfig>
): Promise<ConsistencyReport>;

// 获取配置
export async function getConsistencyConfig(): Promise<ConsistencyConfig>;

// 更新配置
export async function updateConsistencyConfig(
  config: Partial<ConsistencyConfig>
): Promise<void>;
```

## 5. 实现步骤

### Phase 1: 核心框架（0.25天）

1. 创建 `server/src/services/novel/consistency/` 目录
2. 实现 `ConsistencyChecker` 接口
3. 实现 `ConsistencyMonitor` 主类
4. 创建数据库迁移（ConsistencyViolation 表）

### Phase 2: 检查器实现（0.5天）

1. 实现 `TimelineChecker`
2. 实现 `CharacterBehaviorChecker`
3. 实现 `SpatialLogicChecker`
4. 实现缓存策略

### Phase 3: API 和集成（0.25天）

1. 实现 HTTP API
2. 集成到章节生成流程（事件驱动）
3. 实现矛盾报告和通知

### Phase 4: 测试（0.25天）

1. 单元测试：各检查器
2. 集成测试：完整一致性检查流程
3. 边界用例测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 检测不准 | 误报率高 | 高 | 多规则交叉验证 + 可配置阈值 |
| 性能问题 | 检查耗时过长 | 中 | 增量检查 + 缓存 + 异步执行 |
| 中文解析难 | 时间/空间提取不准 | 中 | 预定义模式 + 可扩展规则 |
| 数据不足 | 首章无法检查 | 低 | 至少2章才启动跨章检查 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('TimelineChecker', () => {
  it('should detect time order violations', async () => {});
  it('should detect unreasonable time jumps', async () => {});
  it('should pass when timeline is consistent', async () => {});
});

describe('CharacterBehaviorChecker', () => {
  it('should detect personality shifts', async () => {});
  it('should pass when behavior is consistent', async () => {});
});

describe('SpatialLogicChecker', () => {
  it('should detect position teleportation', async () => {});
  it('should pass with reasonable transitions', async () => {});
});
```

### 7.2 集成测试

```typescript
describe('ConsistencyMonitor', () => {
  it('should run all checkers and produce report', async () => {});
  it('should handle insufficient chapters gracefully', async () => {});
  it('should store violations in database', async () => {});
});
```

## 8. 交付物

- [ ] `server/src/services/novel/consistency/ConsistencyMonitor.ts`
- [ ] `server/src/services/novel/consistency/checkers/TimelineChecker.ts`
- [ ] `server/src/services/novel/consistency/checkers/CharacterBehaviorChecker.ts`
- [ ] `server/src/services/novel/consistency/checkers/SpatialLogicChecker.ts`
- [ ] `server/src/services/novel/consistency/config.ts`
- [ ] `server/src/modules/novel/consistency/http/consistencyRoutes.ts`
- [ ] `server/prisma/migrations/` - 新增 ConsistencyViolation 迁移
- [ ] `server/tests/novel/consistency/` - 测试文件
