# Scripts 目录

本目录包含项目的启动、构建、数据迁移、代码分析等辅助脚本。

## 目录结构

```
scripts/
├── desktop/              # 桌面端发布相关
│   ├── bump-version.cjs  # 更新 desktop/package.json 版本号
│   ├── trigger-release.cjs # 触发桌面端发布（推送到 main）
│   ├── update-release-notes.cjs # 更新桌面端发布说明
│   └── build-portable.cjs # 构建便携式文件夹版本
├── dev/                  # 开发环境管理
│   ├── start-all.ps1     # 一键启动开发环境（server + client）
│   ├── cleanup-zombie.cjs # 清理僵尸进程（三重校验防误杀）
│   ├── write-pid.cjs     # PID 文件管理工具
│   ├── wait-for-port.cjs # 等待端口可用
│   ├── run-with-log.cjs  # 运行命令并记录日志
│   └── clean-dev-db.cjs  # 清理开发数据库（生成种子数据库）
├── data/                 # 数据迁移相关
│   ├── restore-user-data.mjs # 从备份恢复用户数据
│   ├── sync-file-to-db.mjs # 文件系统 → 数据库全量同步
│   └── import-rules.mjs # 反 AI 规则批量导入
├── analysis/             # 代码分析工具
│   ├── list-class-methods.cjs # 列出类的方法
│   ├── print-lines.cjs # 打印文件指定行
│   └── summarize-repair-log.cjs # 总结 LLM 修复日志
├── docs/                 # 文档生成
│   ├── export-git-log.ps1 # 导出 Git 提交信息
│   └── task-md-sync.py # 维护 TASK.md 的 Codex 部分
└── req-sync.js → ../.claude/skills/ll-workflow-core/templates/scripts/req-sync.js
                        # 需求编号同步脚本（符号链接）
```

## 常用脚本

### 开发环境

```bash
# 一键启动开发环境
pnpm dev

# 或使用 PowerShell 脚本
.\scripts\dev\start-all.ps1
.\scripts\dev\start-all.ps1 -Mode desktop  # 启动 Electron 桌面壳
.\scripts\dev\start-all.ps1 -Stop          # 停止所有服务
.\scripts\dev\start-all.ps1 -Restart       # 重启所有服务
```

### 桌面端发布

```bash
# 更新版本号
node scripts/desktop/bump-version.cjs 0.3.20

# 触发发布（推送到 main 分支）
node scripts/desktop/trigger-release.cjs

# 更新发布说明
node scripts/desktop/update-release-notes.cjs

# 构建便携版
node scripts/desktop/build-portable.cjs
```

### 数据迁移

```bash
# 恢复用户数据
node scripts/data/restore-user-data.mjs

# 文件系统 → 数据库同步
node scripts/data/sync-file-to-db.mjs --update

# 导入反 AI 规则
node scripts/data/import-rules.mjs
```

### 代码分析

```bash
# 列出类的方法
node scripts/analysis/list-class-methods.cjs <file>

# 打印文件指定行
node scripts/analysis/print-lines.cjs <file> [start] [end]

# 总结 LLM 修复日志
node scripts/analysis/summarize-repair-log.cjs <path-to-llm-repair.jsonl>
```

## 脚本分类说明

| 分类 | 用途 | 语言 |
|------|------|------|
| desktop/ | 桌面端发布、版本管理、构建 | CJS |
| dev/ | 开发环境启动、进程管理、日志 | CJS/PS1 |
| data/ | 数据迁移、备份恢复、同步 | MJS |
| analysis/ | 代码分析、日志总结 | CJS |
| docs/ | 文档生成、导出 | PS1/PY |

## 注意事项

1. **路径更新**：脚本路径已从 `scripts/` 根目录整理到子目录，请使用新路径
2. **一次性脚本**：已清理废弃的一次性迁移脚本（`migrate-console-to-logger.cjs`、`fix-broken-imports.cjs`、`restore-user-data.ts`、`perf-test-tab-switch.mjs`）
3. **符号链接**：`req-sync.js` 是指向 `.claude/skills/ll-workflow-core/templates/scripts/req-sync.js` 的符号链接
4. **跨平台**：`.cjs` 和 `.mjs` 脚本跨平台可用；`.ps1` 脚本仅 Windows 可用
