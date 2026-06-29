---
description: Release Notes 工作流 — 提交/推送/PR 前的用户可见变更记录规则
---

# README Release Notes 工作流

## Background

面向用户的更新历史需要与代码变更同步维护，而非事后补写。此工作流确保每次提交/推送/PR 前检查是否有用户可见变更需要记录。

## 当前规则

- 在本仓库的任何提交、推送或 PR 步骤之前，使用 `${CODEX_HOME:-~/.codex}/skills/readme-release-updater` 中的 `readme-release-updater` 技能检查 Git 范围、总结用户可见变更、更新 `docs/releases/release-notes.md`，并在适用时刷新 `README.md` 的 `## 最新更新`。
- 如果 `readme-release-updater` 技能在预期的 Codex 技能目录中不存在，在任何提交、推送或 PR 步骤之前先创建它，而不是跳过工作流。
- 创建该技能时，将其放在 `${CODEX_HOME:-~/.codex}/skills/readme-release-updater/` 下，包含一个 `SKILL.md`，明确指示代理：
  - 检查预期提交、推送或 PR 的待处理 Git 范围，包括足够的 status/diff 上下文以理解用户可见变更；
  - 判断 diff 是否有明确的面向用户影响或纯属内部；
  - 更新 `docs/releases/release-notes.md` 作为规范的完整历史，保留旧条目并将同一天的多个更新合并到同一日期标题下；
  - 刷新 `README.md` 的 `## 最新更新` 使其仅显示最新的合并日期块加指向 `docs/releases/release-notes.md` 的链接，而非累积历史章节；
  - 从用户视角编写发布摘要，关注可见功能、工作流改进和产品行为，而非文件路径、重构或仅测试细节；
  - 当前 diff 纯属内部且无明确面向用户影响时，跳过嘈杂的 release note 编辑，并明确说明无需面向用户的 release note 更新。
- `readme-release-updater` 技能还应告诉代理保持仓库的基于日期的发布格式，例如 `### 2026-04-07`，除非用户明确请求版本化过渡，否则不引入语义版本号。
- 如果技能在另一个终端新创建，在继续 Git 写步骤前验证其 `SKILL.md` 包含上述工作流。
- 当用户要求提交或推送代码时，检查该推送的 Git 范围并先更新 `docs/releases/release-notes.md`，然后在 Git 写步骤前同步 `README.md`（如果变更集有明确面向用户影响）。
- `docs/releases/release-notes.md` 是完整的面向用户的更新历史，应保留旧条目。
- `README.md` 仅是最新更新表面，必须保持指向 `docs/releases/release-notes.md` 的链接；不要让 `README.md` 累积多个历史日期块。
- 记录新更新时，在 `docs/releases/release-notes.md` 中保留完整历史，`README.md` 仅显示最新的合并日期块加历史链接。
- 如果同一天记录了多个用户可见更新，在 `docs/releases/release-notes.md` 中将它们合并到同一日期标题下；`README.md` 应仅保留该日期的最新合并摘要。
- 如果当前 diff 纯属内部且无明确面向用户影响，明确说明并跳过两个 release note 更新，而非强制添加嘈杂条目。
- 从用户视角编写两个 release note 表面：描述功能、工作流改进和可见产品行为，而非文件名、路由名、服务名、测试或重构细节。

## 发布标识规则

- 目前，本项目继续使用基于日期的发布/更新标识。除非用户明确决定切换，否则不引入正式的语义版本号。
- `docs/releases/release-notes.md`、`README.md` 的 `## 最新更新`、发布摘要和其他面向用户的更新记录应继续使用现有的日期优先格式，例如：`### 2026-04-07`。
- 在产品工作流、信息架构和发布节奏稳定到足以证明正式版本化系统的合理性之前，保持日期作为主要更新标识符。
- 如果同一天记录了多个用户可见更新，在 `docs/releases/release-notes.md` 中将它们保持在同一日期标题下，通过清晰的摘要文本区分，而非发明临时版本号。

## Related Modules

- `docs/releases/release-notes.md`：完整面向用户更新历史。
- `README.md`：最新更新表面。
- `scripts/update-desktop-release-notes.cjs`：桌面发布 release notes 自动更新。

## 来源文档

- 原始内容迁移自 `AGENTS.md`「README Release Notes 工作流」和「发布标识规则」章节（2026-06-28）。
