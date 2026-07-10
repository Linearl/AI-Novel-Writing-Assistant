---
description: "REQ-7020 共享类型 Barrel 统一导出——技术设计"
update_time: 2026-07-10
---

# REQ-7020 技术设计

## 架构变更

### 变更前（当前状态）

```
@ai-novel/shared               # 32 个模块导出
@ai-novel/shared/types/X       # 55 个模块导出，其中 23 个仅内层 barrel 可用

import { Novel } from "@ai-novel/shared";                    // 可用
import { CreativeHub } from "@ai-novel/shared/types/creativeHub";  // 深层导入
```

### 变更后（目标状态）

```
@ai-novel/shared               # 所有类型模块统一导出

import { Novel, CreativeHub, PayoffLedger } from "@ai-novel/shared";  // 全从顶层导入
```

---

## 实施细节

### Phase 1: Barrel 合并

**当前 `shared/index.ts` 结构**：
```typescript
export * from "./types/novel";
export * from "./types/character";
// ... 约 32 个
```

**目标 `shared/index.ts`**：
```typescript
// 与 shared/types/index.ts 完全同步
export * from "./types/novel";
export * from "./types/character";
export * from "./types/creativeHub";      // 新增
export * from "./types/payoffLedger";      // 新增
// ... 约 55 个
```

**差异分析流程**：
1. 提取 `shared/types/index.ts` 中所有 `export *` 行
2. 提取 `shared/index.ts` 中所有 `export *` 行
3. 求差集，将缺失模块添加到 `shared/index.ts`

### Phase 2: chapterRuntime.ts 拆分

**当前**：`shared/types/chapterRuntime.ts` — 1,044 行

**拆分方案**：

| 子文件 | 内容 | 预估行数 |
|--------|------|---------|
| `chapterDraft.ts` | 草稿创建、内容、字数的类型和 zod schema | ~250 |
| `chapterReview.ts` | 审校、修复、质量检查的类型 | ~300 |
| `chapterGeneration.ts` | 生成配置、流水线、步进的类型 | ~250 |
| `chapterRuntime.ts` | Facade：重新导出以上三个文件 + 共用基础类型 | ~150 |

### Phase 3: Import 审计替换

**搜索模式**：
```
from "@ai-novel/shared/types/
```

**替换策略**：
- 搜索所有匹配文件
- 对每个文件，确认目标模块已在 `shared/index.ts` 中导出
- 替换 import 路径为 `@ai-novel/shared`
- 如发生命名冲突，用 `as` 别名解决

### Phase 4: 测试

在 `shared/tests/` 下创建测试文件：

```typescript
// shared/tests/schemas.test.ts
import { describe, test, expect } from "vitest";
import { novelSchema, chapterSchema } from "@ai-novel/shared";

describe("novelSchema", () => {
  test("validates a minimal novel object", () => {
    const result = novelSchema.safeParse({ id: "1", title: "测试" });
    expect(result.success).toBe(true);
  });
});
```

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| barrel 合并导致循环依赖 | 低 | 高 | 合并前检查依赖图 |
| import 替换导致命名冲突 | 中 | 中 | 检查冲突，用 `as` 别名 |
| chapterRuntime 拆分遗漏类型 | 低 | 中 | 拆分后全量 typecheck |
| 深层导入替换遗漏 | 中 | 低 | 替换后再搜索验证 |

---

## 验证方案

1. Barrel 合并后：`shared/index.ts` 导出数 >= `shared/types/index.ts`
2. 拆分后：无文件 > 700 行
3. Import 替换后：grep `shared/types/` 无残留
4. 全量：`pnpm typecheck` + `pnpm build` + `pnpm test` 通过
