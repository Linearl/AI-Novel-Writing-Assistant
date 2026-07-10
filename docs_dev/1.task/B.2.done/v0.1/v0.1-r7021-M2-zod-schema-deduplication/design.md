---
description: "REQ-7021 Zod Schema 去重与共享化 —— 技术设计"
update_time: 2026-07-10
---

# REQ-7021 技术设计

## 架构变更

### 变更前（当前状态）

```
shared/types/                  server/src/
  ├── canonicalState.ts (177)    ├── services/novel/... (schema A)
  ├── characterResource.ts       ├── agents/character/... (schema A' — 与 A 重复)
  ├── novel.ts                   ├── graphs/... (schema B)
  └── ...                        └── routes/... (schema B' — 与 B 重复)

总计: 1,695 zod 调用             总计: 407 zod 调用（部分与 shared 重复）
```

### 变更后（目标状态）

```
shared/types/                  server/src/
  ├── canonicalState.ts ⟵共享    ├── ... (纯 server 内部 schema，~200)
  ├── characterResource.ts
  ├── novel.ts                   server 侧改为 import { XSchema } from "@ai-novel/shared"
  └── ...                         或用 sharedSchema.extend({ serverOnly: z.xxx() })

总计: ~1,900 zod 调用（含迁移）  总计: <200 zod 调用（纯 server 内部）
```

---

## 实施阶段

### Phase 1: 全量审计

**方法**：对 server/src/ 下所有含 zod 调用的文件执行：
1. grep 定位每个 `z.` 调用
2. 对照 shared/types/ 逐条比对语义
3. 输出审计报告：`{ file, line, schemaName, classification, suggestedTarget }`

**产出**：`docs_dev/3.analysis/evidence/zod-deduplication-audit.csv` — 407 条记录，每行含分类标注。

### Phase 2: 优先级 1 迁移（直接重复）

迁移 server 侧完整复制 shared 已有 schema 的调用点。

**操作**：
- 在 server 侧 `import { XSchema } from "@ai-novel/shared"`
- 删除 server 侧重复定义
- 按 domain（角色 → 状态 → 世界 → 章节 → 配置）逐领域迁移

### Phase 3: 优先级 2 迁移（子集/变体重复）

对 server 侧定义了 shared schema 子集/变体的调用：
- 将变体逻辑用 `.extend()` 或 `.pick()`/`.omit()` 表达
- 若补充字段是纯 server 概念，保留在 server 侧作为 extend

### Phase 4: 优先级 3 合并（语义重复）

对多个 server 文件定义了相同语义 schema 的情况：
- 提取到 shared/types/ 新文件（仅限跨模块使用的）
- 仅两个文件使用的，提取到 shared；只有一个 server 文件使用的，留在 server

### Phase 5: 规则固化

- 更新 CLAUDE.md §2.1 架构约束，增加"新 schema 先去 shared"
- 更新 AGENTS.md 对应章节
- 考虑添加 pre-commit hook 检查 server 侧新引入的重复 zod 调用

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 迁移后 extend 行为差异 | 中 | 高 | 每个迁移后写单元测试验证 |
| shared 单文件过大 | 低 | 中 | 按 domain 拆分子文件 |
| 漏标可迁移 schema | 中 | 低 | 审计阶段使用 grep + 人工确认，不做自动判断 |

---

## 验证方案

1. 审计报告完整（grep count 验证 407 条）
2. 迁移后每个 domain 的 server test 通过
3. `pnpm typecheck` 零错误
4. `pnpm test` 全量通过
5. server 侧 zod 调用计数 <200（`grep -c "z\." server/src/**/*.ts | awk -F: '{sum+=$2} END {print sum}'`）
