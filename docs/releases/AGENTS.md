<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/releases

## Purpose
完整的用户可见 release notes 历史(按日期聚合)。`README.md` 的 `## 最新更新` 只展示最新合并日期块 + 链接到此目录的完整历史。

## Key Files
| File | Description |
|------|-------------|
| `release-notes.md` | 按日期组织(例:`### 2026-04-07`)的完整用户可见更新历史。保留所有旧条目,不裁剪。 |

## For AI Agents

### Workflow (来自根 AGENTS.md "README Release Notes Workflow")
- 提交/push/PR 前:必须用 `readme-release-updater` skill 检查 Git 范围
- 判断当前 diff 是用户可见还是纯内部
- 用户可见:更新 `docs/releases/release-notes.md`(完整历史)+ `README.md` 的 `## 最新更新`(只显示最新块 + 历史链接)
- 纯内部:显式声明"无用户可见变更",跳过更新

### Date-based Release Identification (来自根 AGENTS.md "Release Identification Rules")
- 当前项目使用 **date-based** 标识,不引入 semver
- 例:`### 2026-04-07` 而非 `v0.x.y`
- 同一日多个更新 → 合并到同一日期块下
- 写作用户视角:描述能力/工作流改进/可见产品行为,不写文件名/路由名/服务名/测试/重构

### Skill Location
- `${CODEX_HOME:-~/.codex}/skills/readme-release-updater`
- 若不存在必须先创建,再走 Git 写入

## Dependencies

### Internal
- 根 `AGENTS.md` "README Release Notes Workflow" + "Release Identification Rules" 最高优先级
- `README.md` 仅展示最新合并块