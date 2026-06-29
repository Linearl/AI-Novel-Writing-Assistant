---
description: AI 小说创作工作台 Harness 审计报告 — 五种介质完备性与合理性评估
date: 2026-06-28
scope: project-level harness（CLAUDE.md / settings.json / Linter / CI / Git Hooks / Skills）
---

# Harness 审计报告 — AI 小说创作工作台

## 概览

- **综合等级**：**C**（8/20）
- **完备性**：5/10
- **合理性**：3/10
- **关键发现**：认知层文档详尽（AGENTS.md 299 行 + 双 CLAUDE.md 共 416 行），但约束层几乎空白——无 ESLint、无 pre-commit hooks、无 PR 级 CI、settings.json 无 deny 规则。Agent 主要靠"读文档记住规则"工作，缺乏自动化执行保障。

## 组件清单

| 介质 | 状态 | 评分 | 关键问题 |
|------|------|------|----------|
| CLAUDE.md | ✅ 存在（双文件） | 3/5 | 根 CLAUDE.md 176 行 + `.claude/CLAUDE.md` 240 行 + AGENTS.md 299 行 = 715 行总量超标；大量可形式化规则停留在文档层 |
| settings.json | ❌ 缺失（项目级） | 0/5 | 无 `.claude/settings.json`；`settings.local.json` 仅 2 条 allow 规则；无 deny、无 hooks |
| Linter | ❌ 缺失 | 0/5 | 无 ESLint、无 Prettier、无 `.editorconfig`；`lint` 脚本 = `tsc --noEmit`（仅类型检查，非真正 lint） |
| CI | ⚠️ 部分 | 1/5 | 仅有桌面发布 workflow（beta-release / release）；无 PR 级 lint/test/typecheck 门禁 |
| Git hooks | ❌ 缺失 | 0/5 | 无 `.husky/`、无 `lefthook.yml`、无 `.pre-commit-config.yaml`、settings.json 无 hooks |
| Skills | ✅ 存在 | 1/5 | 仅 `ll-workflow-core`（通用工作流框架），无项目特定 skill（如 auto-director 调试、prompt 治理检查） |

## 反模式检测

| # | 反模式 | 命中？ | 详情 |
|---|--------|--------|------|
| 1 | **CLAUDE.md 垃圾场** | ✅ **命中** | 三文件合计 715 行。AGENTS.md 299 行包含安全规则、架构规则、Wiki 规则、发布规则、桌面打包规则等，大量内容超过 AI 单次上下文的有效利用率。根 CLAUDE.md 176 行超过 150 行阈值。 |
| 2 | **CI-only 质量** | ❌ | CI 本身也很薄，不构成此反模式 |
| 3 | **模糊的 CLAUDE.md 规则** | ⚠️ 轻微 | AGENTS.md 中"不得将 Creative Hub 扩展为通用聊天工具"等规则缺少可判定标准 |
| 4 | **Harness 过硬** | ❌ | 没有 linter，无从过硬 |
| 5 | **Harness 过软** | ✅ **命中** | 所有质量规则均为 CLAUDE.md/AGENTS.md 文档约定，无任何自动化执行手段 |
| 6 | **人类错误信息** | ❌ | 无 linter，无错误信息 |
| 7 | **约束-认知混淆** | ✅ **命中** | AGENTS.md 混合了可形式化的约束（"单文件不超过 700 行"）和不可形式化的认知（"优先修复运行时契约而非 UI 补丁"） |
| 8 | **settings.json 被忽视** | ✅ **命中** | 应由 settings.json 管理的权限、deny 规则、hooks 全部缺失 |
| 9 | **敏感文件未保护** | ✅ **命中** | 无 deny 规则保护 `.env`、credentials、数据库文件。`.gitignore` 列出了 `.env` 但 settings.json 无对应的 Read/Write deny |
| 10 | **无反馈速度梯度** | ✅ **命中** | 所有检查（typecheck）在同一层；无 linter → hook → CI 梯度 |
| 11 | **模块边界全靠约定** | ✅ **命中** | AGENTS.md 描述了架构分层和 Prompt Governance，但无 `no-restricted-imports`、无 `import/no-cycle` |
| 12 | **前后端边界不对称** | ❌ | 两边都没有边界规则，对称地缺失 |
| 13 | **循环依赖无感知** | ✅ **命中** | 无 `import/no-cycle`、无 `madge`、无 `depcheck` |
| 14 | **仅正向规则无负向拦截** | ✅ **命中** | AGENTS.md 有"不要用内联 prompt"等正向规则，但无 linter/CI 拦截违反行为 |

**命中 9/14 反模式**。

## 介质适配违规

以下规则当前放在 CLAUDE.md/AGENTS.md（认知层），但**可以且应该**形式化到 linter/hook/CI：

| 规则 | 当前位置 | 可形式化？ | 建议迁移目标 |
|------|----------|-----------|-------------|
| "单文件不超过 700 行" | AGENTS.md:77-80 | ✅ `wc -l < threshold` | PreToolUse hook（Write 拦截）或 ESLint `max-lines` |
| "目录 .ts 文件超过 12 个" | AGENTS.md:85 | ✅ `ls *.ts \| wc -l` | CI check script |
| "编辑后跑类型检查" | `.claude/CLAUDE.md` 铁律 #2 | ✅ `tsc --noEmit` | PostToolUse hook（已有文档提及但未实际配置） |
| "禁止 `git add .`" | `.claude/CLAUDE.md` 1.5.2 | ✅ 检查 git add 参数 | PreToolUse hook 或 pre-commit hook |
| "Prompt 必须在 registry 注册" | AGENTS.md:248-258 | ✅ grep + 结构检查 | CI lint script |
| "新功能必须有测试" | `.claude/CLAUDE.md` 铁律 #6 | ⚠️ 部分（可检查覆盖率） | CI coverage threshold |
| "UI 文案禁止实现叙述" | AGENTS.md:63-73 | ❌ 需要语义理解 | 保留在 CLAUDE.md + code review |

## 模块边界治理评估

**成熟度级别**：**L0 → L1**（从"无边界"到"文档约定"）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `no-restricted-imports` | ❌ 缺失 | 无 ESLint 配置 |
| `import/no-cycle` | ❌ 缺失 | 无循环依赖检测 |
| `no-internal-modules` | ❌ 缺失 | 无内部 API 标记 |
| 跨模块实体传递限制 | ❌ 仅有文档 | AGENTS.md 描述了 Prompt Governance，无工具执行 |
| 层级依赖方向约束 | ❌ 仅有文档 | AGENTS.md 描述了 `app/ → platform/ → modules/` 方向，无 linter 拦截 |
| `explicit-module-boundary-types` | ❌ 缺失 | 无 ESLint 配置 |
| CI 模块门禁 | ❌ 缺失 | 无 `madge --circular`、无 `depcheck` |

**结论**：模块边界完全依赖 AGENTS.md 文档约定（L1），无任何自动化执行手段。对于一个 300+ 文件的 monorepo，这是一个显著风险。

## 评分详情

### 完备性评分（5/10）

| 维度 | 得分 | 满分 | 说明 |
|------|------|------|------|
| CLAUDE.md | 2 | 2 | 存在且质量良好（有具体规则、引用项目文件） |
| settings.json | 0 | 2 | 项目级完全缺失 |
| Linter | 0 | 2 | 完全缺失 |
| CI | 1 | 2 | 仅桌面发布，无质量门禁 |
| Git hooks | 1 | 1 | 缺失（给 1 分因为 CLAUDE.md 文档提到了 hooks 概念） |
| Skills | 1 | 1 | ll-workflow-core 存在且质量良好 |

### 合理性评分（3/10）

| 维度 | 得分 | 满分 | 说明 |
|------|------|------|------|
| 介质适配 | 1 | 4 | 大量可形式化规则留在文档层 |
| 反模式倒扣 | 0 | 3 | 9/14 反模式命中 |
| 反馈梯度 | 1 | 2 | typecheck 命令存在但未接入 hook/CI |
| 错误信息质量 | 1 | 1 | N/A（无 linter，不扣分） |

## 改进建议

| # | 优先级 | 操作 | 成本 | 预期收益 |
|---|--------|------|------|----------|
| 1 | **P0** | 创建 `.claude/settings.json`，添加 deny 规则保护 `.env`、`credentials*`、`secrets*`，禁止 `rm -rf`、`git push --force`、`git reset --hard` | 低（10 分钟） | 关闭敏感文件泄露和不可逆命令的安全缺口 |
| 2 | **P0** | 在 `.claude/settings.json` 添加 PostToolUse hook：Edit/Write 后自动 `pnpm typecheck` | 低（10 分钟） | 将铁律 #2 从软约束变为硬约束，消除"忘记 typecheck"风险 |
| 3 | **P1** | 初始化 ESLint（`eslint.config.mjs`），启用 `@typescript-eslint` + `max-lines`（700）+ `no-restricted-imports`（模块边界） | 中（1 小时） | 打通 linter 层，为后续规则扩展奠基 |
| 4 | **P1** | 添加 `import/no-cycle` + `madge --circular` 到 CI lint job | 中（30 分钟） | 首次获得循环依赖感知能力 |
| 5 | **P1** | 创建 `.github/workflows/ci.yml`：PR 触发 typecheck + test + lint | 中（30 分钟） | 建立合并前质量门禁 |
| 6 | **P1** | 精简 AGENTS.md：将桌面打包规则（233-244 行）、发布标识规则（281-286 行）等低频规则迁移到 `docs/wiki/`，AGENTS.md 保留 <150 行核心安全+架构规则 | 中（30 分钟） | 降低 AI 上下文噪声，提高规则遵从率 |
| 7 | **P2** | 添加 pre-commit hook（通过 settings.json hooks 或 `.husky/`）：格式化 + lint-staged | 中（30 分钟） | 建立 linter → hook → CI 反馈梯度 |
| 8 | **P2** | 创建项目特定 skill：`auto-director-debug`、`prompt-governance-check` | 高（2 小时） | 补充认知层缺口，降低 AGENTS.md 负载 |
| 9 | **P2** | ESLint 添加 `no-restricted-imports` 规则链：server routes ↛ 直接 import prisma、client ↛ 直接 import server 内部模块 | 中（1 小时） | 从 L1（文档约定）升级到 L2（路径级拦截） |
| 10 | **P3** | 添加 `.editorconfig`（UTF-8、2 空格缩进、LF 行尾） | 低（5 分钟） | 统一编辑器基础格式 |
| 11 | **P3** | 添加 `depcheck` 到 CI，检测未声明/未使用的依赖 | 低（10 分钟） | 依赖卫生 |
| 12 | **P3** | 前端添加对应的 ESLint 边界规则（与后端对称） | 中（30 分钟） | 修复前后端边界不对称 |

## 快速见效（<30 分钟总计）

以下 3 项投入低、回报高，建议立即执行：

### 1. 创建 `.claude/settings.json`（10 分钟）

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/credentials*)",
      "Read(**/secrets*)",
      "Write(**/.env)",
      "Write(**/.env.*)",
      "Write(**/credentials*)",
      "Write(**/secrets*)",
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)"
    ],
    "allow": [
      "Bash(pnpm *)",
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git stash *)",
      "Bash(node *)",
      "Bash(npx *)",
      "Bash(curl *)"
    ]
  }
}
```

### 2. 添加 PostToolUse typecheck hook（10 分钟）

在 `.claude/settings.json` 中追加：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "OUTPUT=$(pnpm typecheck 2>&1); if [ -n \"$OUTPUT\" ]; then echo \"$OUTPUT\" | tail -25; echo \"[typecheck] 发现问题 ↑\"; else echo \"[typecheck] 通过 ✓\"; fi",
        "description": "编辑后自动类型检查"
      }
    ]
  }
}
```

### 3. 精简 AGENTS.md 至 <150 行（10 分钟）

将桌面打包规则（233-244 行）、发布标识规则（281-286 行）、Wiki 编写详细规则（95-177 行）迁移到 `docs/wiki/` 对应页面，AGENTS.md 仅保留：数据保护、AI-First、Auto-Director 质量门、产品上下文、架构规则摘要、Prompt 治理摘要。

---

## 附录：五种介质状态速查

```
┌──────────────────────────────────────────────────────────────┐
│                    约束层（Constraint Layer）                  │
├──────────────┬──────────┬──────────────────────────────────────┤
│ 介质         │ 状态     │ 说明                                 │
├──────────────┼──────────┼──────────────────────────────────────┤
│ CLAUDE.md    │ ✅ 3/5   │ 双文件+AGENTS.md，内容详尽但过长       │
│ settings.json│ ❌ 0/5   │ 项目级完全缺失                       │
│ Linter       │ ❌ 0/5   │ 无 ESLint/Prettier，lint=tsc--noEmit │
│ CI           │ ⚠️ 1/5   │ 仅桌面发布，无 PR 质量门禁            │
│ Git hooks    │ ❌ 0/5   │ 完全缺失                             │
├──────────────┴──────────┴──────────────────────────────────────┤
│                    认知层（Cognitive Layer）                    │
├──────────────┬──────────┬──────────────────────────────────────┤
│ Skills       │ ⚠️ 1/5   │ 仅 ll-workflow-core，无项目特定 skill  │
└──────────────┴──────────┴──────────────────────────────────────┘
```

## 附录：与同类项目对比参考

| 维度 | 本项目 | 行业最佳实践 |
|------|--------|-------------|
| CLAUDE.md 行数 | 715（三文件合计） | <150（单文件），细节推到 skills/docs |
| ESLint 规则数 | 0 | 20-50 条（含模块边界） |
| CI workflow 数 | 2（仅发布） | 3-5（含 PR 质量门禁） |
| Pre-commit hooks | 0 | 2-3（format + lint + typecheck） |
| settings.json deny 规则 | 0 | 8-15 条 |
| 循环依赖检测 | 无 | madge + CI 门禁 |
| 模块边界成熟度 | L1（文档约定） | L3-L4（标签约束+CI 门禁） |
