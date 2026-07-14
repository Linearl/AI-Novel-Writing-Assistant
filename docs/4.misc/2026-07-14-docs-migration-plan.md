---
description: docs/ 与 docs_dev/ 合并迁移方案 — 将上游 docs/ 内容合并到 docs_dev/ 编号体系，然后重命名 docs_dev → docs
---

# docs 合并迁移方案

> 日期：2026-07-14 | 状态：待执行

---

## 背景

- `docs/`（80 文件）— 上游仓库带过来，按功能分类（architecture/design/plans/wiki/checkpoints/releases）
- `docs_dev/`（1002 文件）— 本地习惯的编号体系，ll-workflow-core 工作区（0.version_plan/1.task/2.tech/...）

目标：**合并上游 docs/ 有内容到 docs_dev/，删除旧 docs/，将 docs_dev/ 重命名为 docs/**。

---

## 现状对比

### docs/ 内容分布（80 文件）

| 子目录 | 文件数 | 内容 |
|--------|--------|------|
| `architecture/` | 2 | dependency-injection.md, testing.md |
| `checkpoints/` | 4 | chapter-editor-v2-progress.md 等 |
| `design/` | 9 | style-engine-*.md, world-management-v2.md 等 |
| `guides/` | 1 | sync-feature-location.md |
| `plans/` | 13 | 各模块计划文档 |
| `releases/` | 2 | release-notes.md, AGENTS.md |
| `superpowers/` | 1 | plans/2026-04-25-lucky-beta-selective-port.md |
| `wiki/` | 45 | 架构/工作流/调试/产品/Prompt/RAG 知识沉淀 |
| 根文件 | 3 | README.md, AGENTS.md |

### docs_dev/ 内容分布（1002 文件）

| 子目录 | 文件数 | 用途 |
|--------|--------|------|
| `0.version_plan/` | 5 | 版本计划/里程碑 |
| `1.task/` | 772 | 任务管理（六件套）|
| `2.tech/` | 7 | 技术文档 |
| `3.analysis/` | 32 | 分析诊断 |
| `4.misc/` | 13 | 杂项/交接 |
| `5.git-commit/` | 2 | git 提交模板 |
| `7.weekly/` | 3 | 周报 |

### 唯一冲突文件

`README.md` — 两边各有一份，内容完全不同，需合并。

---

## 冲突分析：内容去向

| 上游 docs/ 子目录 | 迁移到 docs_dev/ | 理由 |
|-------------------|------------------|------|
| `architecture/` | **→ `2.tech/architecture/`** | 技术架构文档，归属 tech 体系 |
| `design/` | **→ `2.tech/design/`**（新建）| 模块设计文档，归属 tech 体系 |
| `plans/` | **→ `2.tech/plans/`**（新建）| 模块计划，归属 tech 体系 |
| `wiki/` | **→ `4.misc/wiki/`**（新建）| 知识沉淀，保留在 misc 下供查阅 |
| `checkpoints/` | **→ `4.misc/checkpoints/`**（新建）| 阶段检查点，历史归档性质 |
| `releases/` | **→ `6.changelog/releases/`**（新建）| 发布说明，与 changelog 同族 |
| `guides/` | **→ `2.tech/guide/`**（已有，合并）| 操作指南，直接合并 |
| `superpowers/` | **→ `4.misc/superpowers/`**（新建）| 特殊计划，归 misc |
| `AGENTS.md` | **→ `4.misc/upstream-agents.md`** | 上游 AI agent 说明，保留参考 |
| `README.md` | **→ 合并到 `docs_dev/README.md`** | 各取所需，不重复 |

---

## 执行阶段

### 阶段 1：准备（不改代码，只搬文件）

```bash
# 1.1 创建目标子目录
mkdir -p docs_dev/2.tech/design
mkdir -p docs_dev/2.tech/plans
mkdir -p docs_dev/4.misc/wiki
mkdir -p docs_dev/4.misc/checkpoints
mkdir -p docs_dev/4.misc/superpowers
mkdir -p docs_dev/6.changelog/releases

# 1.2 搬迁 docs/architecture/ → 2.tech/architecture/
mv docs/architecture/* docs_dev/2.tech/architecture/

# 1.3 搬迁 docs/design/ → 2.tech/design/
mv docs/design/* docs_dev/2.tech/design/

# 1.4 搬迁 docs/plans/ → 2.tech/plans/
mv docs/plans/* docs_dev/2.tech/plans/

# 1.5 搬迁 docs/wiki/ → 4.misc/wiki/
mv docs/wiki/* docs_dev/4.misc/wiki/

# 1.6 搬迁 docs/checkpoints/ → 4.misc/checkpoints/
mv docs/checkpoints/* docs_dev/4.misc/checkpoints/

# 1.7 搬迁 docs/releases/ → 6.changelog/releases/
mv docs/releases/* docs_dev/6.changelog/releases/

# 1.8 搬迁 docs/guides/ → 2.tech/guide/（合并）
mv docs/guides/* docs_dev/2.tech/guide/

# 1.9 搬迁 docs/superpowers/ → 4.misc/superpowers/
mv docs/superpowers/* docs_dev/4.misc/superpowers/

# 1.10 保留上游 AGENTS.md 为参考副本
mv docs/AGENTS.md docs_dev/4.misc/upstream-agents.md

# 1.11 合并 README.md（见下方说明）
# 手动合并：docs/README.md 的目录划分说明 + docs_dev/README.md 的工作区说明
```

**README.md 合并策略**：保留 `docs_dev/README.md` 为主体，将 `docs/README.md` 中「目录划分」和「维护约束」两节作为附录追加到末尾，标题改为「上游文档目录划分（已迁移）」。

---

### 阶段 2：重命名目录

```bash
# 2.1 删除已清空的旧 docs/ 目录
rm -rf docs/

# 2.2 重命名 docs_dev → docs
git mv docs_dev docs
```

> 注意：`docs_dev/1.task/` 内有 772 个文件，`git mv` 可能较慢，可先 `git add` 再操作。
> 若 `git mv` 太慢，也可先 `mv docs_dev docs`，再 `git add -A docs/ && git rm -r --cached docs_dev/`。

---

### 阶段 3：修改引用文件

以下文件包含 `docs_dev` 或 `docs/` 的路径引用，必须同步更新：

| 文件 | 需修改内容 |
|------|-----------|
| `.ll-workflow.yaml` | 所有 `docs_dev` → `docs`；`project.description` 更新说明 |
| `CLAUDE.md`（根目录）| `docs/` 描述更新（不再有 architecture/wiki 等子目录，改为编号体系说明）；`docs_dev/` 引用全部改为 `docs/` |
| `.claude/CLAUDE.md` | `docs_dev/4.misc/issues/` → `docs/4.misc/issues/` |
| `docs/README.md`（新）| 更新后的内容，反映统一后的编号体系 |
| `.github/AGENTS.md` | 无需修改（只引用 `desktop/AGENTS.md`，不涉及 docs） |

### `.ll-workflow.yaml` 修改要点

```yaml
# 修改前
variables:
  docs: docs_dev

project:
  description: >
    业务侧文档在 docs/(architecture/design/plans/releases/wiki/checkpoints/superpowers),
    ...
    在仓库内新建 docs_dev/ 作为 ll-workflow-core 的工作区,
    与业务 docs/ 完全隔离。

slots:
  docs_root: "${ target_dev_dir }/docs_dev"
  docs_index: "${ target_dev_dir }/docs_dev/INDEX.md"
  # ... 所有 docs_dev 引用

workflows:
  init:
    import_source: "${ target_dev_dir }/docs/legacy"

# 修改后
variables:
  docs: docs

project:
  description: >
    AI 小说写作助手。pnpm monorepo(client/server/shared/desktop)。
    文档统一在 docs/ 目录下，采用编号化体系管理。
    ll-workflow-core 工作区与业务文档共用 docs/ 目录。

slots:
  docs_root: "${ target_dev_dir }/docs"
  docs_index: "${ target_dev_dir }/docs/INDEX.md"
  # ... 所有 docs_dev → docs

workflows:
  init:
    import_source: "${ target_dev_dir }/docs/legacy"
    # 注意：若 docs/legacy 不存在，此行需删除或改路径
```

### `CLAUDE.md` 修改要点

```
# 修改前
docs/            架构决策、Wiki、Release Notes、Checkpoints
# 修改后
docs/            编号化文档体系（0.version_plan / 1.task / 2.tech / 3.analysis / 4.misc / 5.git-commit / 6.changelog / 7.weekly / 8.test）
```

所有 `docs_dev/` 引用改为 `docs/`。

---

### 阶段 4：验证

```bash
# 4.1 检查无残留 docs_dev 引用
grep -r 'docs_dev' --include='*.md' --include='*.yaml' --include='*.json' --include='*.ts' --include='*.js' . | grep -v node_modules | grep -v '.git/'

# 4.2 检查旧 docs/ 目录已删除
ls docs/ 2>/dev/null || echo "docs/ 已清理"

# 4.3 类型检查（确保无代码引用受影响）
pnpm typecheck

# 4.4 git status 确认变更范围
git status
```

---

### 阶段 5：提交

```bash
git add docs/ .ll-workflow.yaml CLAUDE.md .claude/CLAUDE.md
git commit -m "refactor: 合并 docs/ 与 docs_dev/ 为统一 docs/ 编号体系"
```

---

## 风险与注意事项

1. **`docs/legacy` 导入路径**：~~`.ll-workflow.yaml` 中 `init.import_source` 指向 `docs/legacy`，该目录不存在。~~ **已确认：删除此行。**

2. **`ll-workflow-core init` skill**：`routes/init/README.md` 和 `templates/workflows/init.workflow.yaml` 中有 `docs_dev` 引用，需确认是否自动从 `.ll-workflow.yaml` 变量解析（若是则无需改 skill 代码）。

3. **`requirements.md` 自动更新**：该文件由 git hooks 自动维护，路径变更后需确认 hook 脚本路径已更新。

4. **`temp/` 目录**：`temp/AI-Novel-Writing-Assistant-main*/README.md` 中有上游 `docs/` 引用，属临时目录，不需要修改。

5. **task 包内文档**：`docs_dev/1.task/B.2.done/` 中大量任务包可能在 `design.md` 等文件内引用了 `docs/xxx` 路径。迁移后这些路径仍有效（因为 `docs/` 仍然存在且内容已迁入），无需逐个修改。

---

## 执行顺序总结

```
阶段 1（搬文件）→ 阶段 2（删旧 docs/ + 重命名）→ 阶段 3（改引用）→ 阶段 4（验证）→ 阶段 5（提交）
```

**预计变更**：约 80 个文件移动，4 个配置文件编辑，1 次提交。
