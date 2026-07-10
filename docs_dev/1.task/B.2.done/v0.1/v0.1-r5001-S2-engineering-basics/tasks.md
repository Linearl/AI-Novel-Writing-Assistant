---
description: "补齐工程化基础配置 — REQ-5001 任务拆解"
---

# REQ-5001 任务拆解

## 阶段一：配置文件创建

- [x] **T1.1** 创建 `.env.example`
  - 参考 CLAUDE.md 和 server/.env 现有内容
  - 列出所有环境变量 + 默认值 + 用途注释
- [x] **T1.2** 创建 `.editorconfig`
  - 按规范配置 indent_style=space, indent_size=2, charset=utf-8, end_of_line=lf
- [x] **T1.3** 创建 4 个子包 README.md
  - client: React 19 + Vite 前端
  - server: Express 5 + Prisma 7 后端
  - shared: 共享类型包
  - desktop: Electron 壳

## 阶段二：文档补充

- [x] **T2.1** release-notes.md 头部添加版本→日期映射
  - 从现有日期标题逆向提取 semver
  - 格式：`| v0.3.21 | 2026-07-01 |`
- [x] **T2.2** 创建 Prisma 迁移回滚 SOP 文档
  - 路径：`docs/2.tech/guide/prisma-migration-rollback.md`
  - 内容：手动回滚步骤 + 验证方法 + 注意事项

## 阶段三：验证

- [x] **T3.1** 确认所有 5 个新文件存在且格式正确
- [x] **T3.2** `git status` 确认仅新增配置/文档文件
