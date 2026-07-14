---
description: "REQ-7022 Services 目录收敛与大文件拆分 —— 技术设计"
update_time: 2026-07-10
---

# REQ-7022 技术设计

## 架构变更

### 变更前（当前状态）

```
services/
├── novel/
│   ├── director/
│   │   ├── commands/      (3 files)
│   │   ├── debug/         (2 files)
│   │   ├── runtime/       (36 files)
│   │   ├── state/         (n files)
│   │   ├── StateFoo.ts    (可能与 state/Foo.ts 重复)
│   │   ├── StateBar.ts
│   │   └── ...
│   ├── (超大文件 n 个, >680 行)
│   └── ... (34 subdirs)
```

### 变更后（目标状态）

```
services/
├── novel/
│   ├── director/
│   │   ├── operations/    (5 files: 原 debug/ + commands/)
│   │   ├── runtime/       (36 files, 不变)
│   │   ├── state/         (统一 state 定义)
│   │   └── ...
│   ├── (所有文件 <600 行)
│   └── ... (34 subdirs, 部分已合并)
```

---

## 实施阶段

### Phase 1: 大小审计

1. 统计 `services/` 下所有 .ts 文件行数
2. 输出 >680 行的文件清单（预计 8 个）
3. 对每个超大文件分析职责边界，制定拆分方案

### Phase 2: 大文件拆分

对每个超大文件：
1. 分析内部职责边界（类/函数/export 分组）
2. 规划新文件拆分方案
3. 创建 `index.ts` facade 维持原导入兼容
4. 逐文件验证 typecheck

**拆分模式**：
- 类+辅助函数 → 类文件 + `utils/helpers.ts`
- 多 service 混放 → 拆成独立 service 文件
- 配置/常量/类型 → `constants.ts` + `types.ts`

### Phase 3: Director 子目录收敛

1. 审计 `debug/` 和 `commands/` 的全部函数/export
2. 确认合并到 `operations/` 无命名冲突
3. 执行合并：`git mv` 文件 + 更新 import 路径
4. 删除空洞目录

### Phase 4: Novel 子目录内聚性审计

1. 遍历 `services/novel/` 下 34 个子目录
2. 对文件数 <3 的目录，检查职能是否有重叠的兄弟目录
3. 输出审计报告，标注可合并项

### Phase 5: State 文件去重

1. grep `services/novel/director/` 下 State*.ts
2. 对比 `director/state/` 下同名/相似文件
3. 合并或重命名消除歧义

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 拆分后循环依赖 | 中 | 高 | Phase 1 分析 import 图，先解耦再拆分 |
| 导入路径断裂 | 高 | 低 | facade index.ts + 全局 grep 验证 |
| State 合并引入功能回归 | 低 | 中 | 保留原文件为 deprecated re-export，观察一轮 CI |

---

## 验证方案

1. 拆分后每文件 `wc -l` 验证均 <600 行
2. `pnpm typecheck` 零错误
3. `pnpm test` 全量通过
4. 无 broken import（lint 检查）
