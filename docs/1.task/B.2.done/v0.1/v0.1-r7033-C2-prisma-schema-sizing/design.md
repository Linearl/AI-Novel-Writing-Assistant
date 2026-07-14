---
description: "REQ-7033 Prisma Schema 精简 — 方案设计"
---

# REQ-7033 方案设计

## 1. 方案概述

分两步走：第一步审计评估（T1~T3），第二步实施（T4~T6）。审计阶段产出分类报告和可行性评估，实施阶段根据审计结论执行具体变更。

### 1.1 设计目标

1. 降低 schema.prisma 的行数和维护负担
2. Novel 模型从 50+ 列收敛到 30 列以内
3. 建立可持续的 Schema 增长治理机制

### 1.2 关键决策

1. **审计先行**：在动 schema 前先完成宽表分类和非核心模型依赖分析
2. **评估门控**：多 schema 方案需通过可行性评估后才能实施
3. **JSON 收敛优先于多 schema**：宽表收敛是低风险操作（仅合并字段），多 schema 拆分是高影响操作（改变构建流程）

### 1.3 不在范围

- 不修改 Prisma 版本
- 不修改数据库引擎选择

---

## 2. 方案选项

### 选项 A：仅宽表收敛（低风险）

将 Novel 模型的 B 类字段收敛为 1-2 个 JSON 列，不改 schema 文件结构。

**优点**：改动范围小，不改变构建流程，风险低。
**缺点**：不解决 drama-forge/comic 模型混入问题。

### 选项 B：多 schema 拆分（高风险）

使用 Prisma 7.x `prismaSchemaFolder` 特性，将 drama-forge、comic 的模型拆分到独立 schema 文件。

**文件结构**：
```
server/src/prisma/
├── schema/
│   ├── core.prisma      # 核心模型（Novel, Character, World 等）
│   ├── drama-forge.prisma
│   └── comic.prisma
├── schema.prisma         # 或 schema/ 替代该文件
└── schema.sqlite.prisma
```

**优点**：从根本上解决模块耦合，每个模块独立演进。
**缺点**：Prisma Client 生成路径变化，需验证 SQLite 兼容性。

### 选项 C：混合方案（推荐）

先执行宽表收敛（选项 A），再评估多 schema 拆分（选项 B 的评估阶段）。如评估通过则继续拆分，否则仅以宽表收敛结项。

---

## 3. 实施阶段

### Phase 1: 审计（T1 + T2）

1. 遍历 schema.prisma 中 Novel 模型的所有列，按 A/B/C 三类标注
2. 分析 drama-forge 和 comic 模型的依赖关系图
3. 产出审计报告

### Phase 2: 评估（T3）

1. 调研 Prisma 7.x `prismaSchemaFolder` 特性
2. 验证 SQLite + PostgreSQL 双引擎兼容性
3. 产出可行性评估文档 + 推荐方案

### Phase 3: 实施（T4 + T5）

1. 根据审计结论执行宽表收敛
2. 根据评估结论执行多 schema 拆分或跳过
3. 精简迁移历史

### Phase 4: 治理（T6）

在 CLAUDE.md 中添加 Schema 增长治理规则。

### Phase 5: 验证（T7）

typecheck + test + db:migrate + db:studio。

---

## 4. Novel 宽表审计参考维度

| 分类 | 判别标准 | 示例 |
|------|----------|------|
| A 核心字段 | 高频查询条件、标识字段、时间戳 | `id`, `title`, `status`, `genre`, `createdAt` |
| B JSON 收敛候选 | 低频读取、结构化松散、已有独立表的扩展 | `storyWorldSliceJson`（已有 NovelWorld），其他低频 JSON 列 |
| C 可迁移字段 | 与核心管线松耦合，可归属到其他模块 | drama-forge 或 comic 相关字段 |

---

## 5. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| JSON 收敛后查询效率下降 | 低 | 中 | 仅收敛低频字段；保留高频查询列 |
| 多 schema 与 SQLite 不兼容 | 中 | 高 | 评估阶段优先验证 |
| 迁移 squash 出错 | 低 | 中 | 保留备份；在开发环境先验证 |
| Prisma Client 生成失败 | 中 | 高 | 本地验证后再提交 |

---

## 6. 验证方案

1. 宽表收敛后：对比收敛前后的 Prisma Client 类型，确保读写接口不变
2. 多 schema 后：`pnpm prisma generate` 成功 + `pnpm typecheck` 零错误
3. 迁移后：`pnpm db:migrate` 成功 + `pnpm db:studio` 数据完整
