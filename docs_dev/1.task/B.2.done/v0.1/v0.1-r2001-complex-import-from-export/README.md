---
description: "REQ-2001 从导出文件导入创建新书 任务总线"
---

# REQ-2001 从导出文件导入创建新书

> 创建日期：2026-06-26
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户反馈：导出小说数据后创建新书时无法导入此前的导出文件，只能手动逐字段填写。系统目前支持 TXT / Markdown / JSON 三种格式导出，但没有任何对应的导入功能。

### 1.2 核心内容

1. 创建新书页面增加"从导出文件导入"入口，支持上传 JSON 导出文件
2. 自动解析 `NovelExportBundle` 结构，将 `basic` section 回填到创建表单字段
3. 服务端新增导入 API 端点，支持新书创建后按 scope 回填剩余数据（角色、大纲、章节等）
4. 支持全量导入与按 scope 选择性导入

### 1.3 前置条件

- 导出模块（`server/src/modules/export/`）已稳定
- 创建新书接口 `POST /api/novels` 已存在
- 共享类型 `shared/types/novelExport.ts` 已定义完整 scope 和 format

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2001-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2001.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-26 | 🆕 激活 | req 路由创建任务包 |
| 2026-06-26 | ⏳ 进行中 | requirements / design / tasks 生成中 |

---

## 4. 执行清单

- [ ] 生成 requirements.md
- [ ] 生成 design.md
- [ ] 生成 tasks.md
- [ ] dev 路由推进实现
