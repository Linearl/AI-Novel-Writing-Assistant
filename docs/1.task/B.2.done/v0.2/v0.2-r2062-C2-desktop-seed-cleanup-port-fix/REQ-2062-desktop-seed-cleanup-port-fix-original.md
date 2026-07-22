---
description: "REQ-2062 桌面端种子数据库清理与端口配置优化"
update_time: 2026-07-21
---

# REQ-2062 桌面端种子数据库清理与端口配置优化

> 状态：🚧 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2062 |
| 优先级 | P1 |
| 来源 | 用户反馈 — 桌面构建包含敏感数据和端口冲突 |
| 关联需求 | 无 |

---

## 1. 背景与问题

### 问题 1：种子数据库包含敏感数据

桌面端构建时，`stage-desktop.cjs` 将 `server/dev.db` 复制为种子数据库。该数据库包含：
- 10 个 LLM API Key（`APIKey` 表）
- 4 个小说项目及所有关联数据（`Novel` 及 50+ 张子表）
- 27 个应用设置（`AppSetting` 表）
- 11 个模型路由配置（`ModelRouteConfig` 表）

导致打包后的桌面版本携带用户的敏感配置和测试数据。

### 问题 2：桌面端口配置冲突

| 模式 | 当前端口 | 问题 |
|------|---------|------|
| External（开发调试） | `3000` | 与实际 Web server 的 `13000` 不匹配 |
| Managed（打包后） | 随机端口 | 端口不确定，难以预测 |

---

## 2. 目标与范围

### 2.1 目标

1. 构建时自动清理种子数据库中的敏感数据，保留产品预设
2. 桌面端 external 模式默认端口改为 `13000`
3. 桌面端 managed 模式默认端口改为 `14250`（13000 + 1250）

### 2.2 In Scope

**后端/构建**：
- 新增 `scripts/clean-dev-db.js` 清理脚本
- 修改 `desktop/scripts/stage-desktop.cjs` 集成清理流程
- 修改 `desktop/src/runtime/server.ts` 端口配置

### 2.3 Out of Scope

- 运行时首次启动清理（本次不涉及）
- Web server 端口配置（保持 13000）

---

## 3. 需求详情

### 3.1 种子数据库清理

**清理范围**（137 张表）：

| 分类 | 表名 | 处理 |
|------|------|------|
| 配置 | `APIKey`, `AppSetting`, `ModelRouteConfig` | DELETE |
| 小说核心 | `Novel` 及所有子表（50+ 张） | DELETE |
| 章节 | `Chapter` 及关联表（6 张） | DELETE |
| 角色 | `Character` 及关联表（21 张） | DELETE |
| 世界观 | `World` 及关联表（10 张） | DELETE |
| 自动导演 | `Director*`, `AutoDirector*`（15 张） | DELETE |
| 创作 | `Story*`, `Book*`, `Plot*` 等（16 张） | DELETE |
| 其他 | 任务中心、审计、知识库等（45+ 张） | DELETE |

**保留范围**（4 张表）：

| 表名 | 说明 |
|------|------|
| `AntiAiRule` | AI 检测规则预设（28 条） |
| `WritingTechnique` | 写作技法预设（98 条） |
| `StyleTemplate` | 风格模板预设（8 条） |
| `_prisma_migrations` | 迁移记录（系统表） |

**实现方式**：
1. 复制 `server/dev.db` 到临时位置
2. 使用 better-sqlite3 打开副本
3. 按外键依赖顺序清空 137 张表
4. 使用清理后的副本作为种子数据库
5. 原始 `dev.db` 保持不变

### 3.2 端口配置

**修改位置**：`desktop/src/runtime/server.ts`

| 模式 | 原默认端口 | 新默认端口 | 说明 |
|------|-----------|-----------|------|
| External | `3000` | `13000` | 与 Web 开发 server 一致 |
| Managed | 随机 | `14250` | 13000 + 1250 偏移 |

---

## 4. 验收标准

1. 构建桌面版本后，种子数据库不包含 APIKey、Novel、AppSetting 数据
2. 产品预设（AntiAiRule、WritingTechnique、StyleTemplate）保留完整
3. 原始 `server/dev.db` 不被修改
4. External 模式默认连接 `localhost:13000`
5. Managed 模式默认使用端口 `14250`
6. 类型检查通过：`pnpm typecheck`
7. 桌面构建成功：`node scripts/build-portable-dir.js`
