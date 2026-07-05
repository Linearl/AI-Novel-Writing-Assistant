---
description: "REQ-2035 大纲终稿锁定 方案设计"
update_time: 2026-07-03
---

# REQ-2035 方案设计

## 1. 方案概述

采用"Chapter 布尔标记 + 各阶段前置过滤"的实现方案。在 Chapter 数据模型中增加 `locked: boolean` 字段，auto-director 各阶段在操作前查询 locked 状态并过滤，前端通过专用 API 端点切换锁定状态。

### 1.1 设计目标

1. 最小化对 auto-director 现有逻辑的侵入——仅在各阶段入口处增加一次 locked 查询和过滤
2. 锁定/解锁操作简单直观——单个按钮切换
3. 数据模型改动最小——一个 Boolean 字段

### 1.2 关键决策

1. **章节级锁定**：锁定粒度为整个章节（非字段级），简化实现且覆盖 80% 场景
2. **locked 字段默认 false**：新创建的章节默认不锁定，用户主动锁定
3. **专用 API 端点**：使用 `PATCH /chapters/:id/lock` 而非复用通用 PATCH，语义更清晰
4. **前端即时反馈**：锁定/解锁后立即更新 UI，不等待列表刷新

### 1.3 不在范围

- 字段级锁定
- 自动锁定
- 锁定策略配置

## 2. 实现细节

### 2.1 数据模型变更

#### 2.1.1 Prisma schema

```prisma
model Chapter {
  // ... existing fields ...
  locked Boolean @default(false)
}
```

新增字段位于 Chapter 模型末尾，`@default(false)` 确保所有现有章节自动为未锁定状态。

#### 2.1.2 共享类型

```typescript
// shared/types/novel.ts（或对应文件）
interface Chapter {
  // ... existing fields ...
  locked: boolean
}
```

#### 2.1.3 数据库迁移

执行 `prisma migrate dev` 生成迁移文件，SQLite 和 PostgreSQL 均支持 `ALTER TABLE ... ADD COLUMN ... DEFAULT`。

### 2.2 后端

#### 2.2.1 API 端点

**`PATCH /api/chapters/:id/lock`**

请求体：
```typescript
interface ChapterLockRequest {
  locked: boolean
}
```

响应体：
```typescript
interface ChapterLockResponse {
  id: string
  locked: boolean
}
```

实现位置：
- 路由：`server/src/modules/novel/http/chapterRoutes.ts`（或现有章节路由文件）
- 服务：`server/src/modules/novel/novel.service.ts`（或对应章节 service 方法）

#### 2.2.2 auto-director 过滤逻辑

在 auto-director 的 5 个阶段入口处，增加以下过滤模式：

```typescript
// 伪代码：各阶段入口
const allChapters = await prisma.chapter.findMany({ where: { novelId } })
const unlockedChapters = allChapters.filter(ch => !ch.locked)
// 后续操作仅针对 unlockedChapters
```

具体修改位置（按任务优先级排序）：

| 阶段 | 预期位置 | 过滤方式 |
| ---- | ---- | ---- |
| replan | `server/src/services/novel/director/` 或 `server/src/graphs/` | 查询章节时增加 `where: { locked: false }` |
| full_audit | `server/src/services/novel/director/` | 同上 |
| 补充关系网 | `server/src/services/novel/director/` | 同上 |
| 补充时间线 | `server/src/services/novel/director/` | 同上 |
| 章节标题修复 | `server/src/services/novel/director/` | 同上 |

**过滤策略**：优先在数据库查询层过滤（`where: { locked: false }`），减少内存中处理的数据量。如果某个阶段需要遍历所有章节（例如需要知道总数），则在应用层过滤。

#### 2.2.3 边界情况处理

- **所有章节均已锁定**：auto-director 跳过该阶段，不报错。等价于用户明确表示"不要改任何内容"。
- **replan 输入为空**：replan 阶段如果所有章节都锁定，跳过 replan 执行，记录日志。

### 2.3 前端

#### 2.3.1 章节列表锁定按钮

在章节列表的每个章节行/卡片中，增加锁图标按钮：

- 未锁定状态：显示 `LockOpen` 图标（或类似开锁图标），点击调用 `PATCH /chapters/:id/lock { locked: true }`
- 已锁定状态：显示 `Lock` 图标（或类似锁图标），点击调用 `PATCH /chapters/:id/lock { locked: false }`

#### 2.3.2 锁定状态视觉标识

已锁定章节的视觉区分方案：

- 图标：锁图标（`Lock` / `LockClosed`）
- 样式：可选降低透明度或添加锁定边框色
- Tooltip：hover 时显示"已锁定 — auto-director 不会修改此章节"

#### 2.3.3 组件结构

```
client/src/pages/novels/components/
├── ChapterList.tsx          # 章节列表（修改）
│   └── ChapterLockButton.tsx  # 锁定按钮子组件（新增）
```

`ChapterLockButton` 组件职责：
- 接收 `chapterId` 和 `locked` 状态
- 点击时调用 lock API
- 乐观更新（optimistic update）：先更新本地状态，API 失败时回滚

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 | Content-Type |
| ---- | ---- | ---- | ------------ |
| PATCH | `/api/chapters/:id/lock` | 切换章节锁定状态 | `application/json` |

### 3.2 请求示例

```json
{
  "locked": true
}
```

### 3.3 响应示例

```json
{
  "id": "chapter-uuid",
  "locked": true
}
```

## 4. 数据模型

### 4.1 新增字段

| 表 | 字段 | 类型 | 默认值 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| Chapter | locked | Boolean | false | 章节是否已锁定 |

### 4.2 迁移影响

- SQLite：`ALTER TABLE Chapter ADD COLUMN locked BOOLEAN NOT NULL DEFAULT false`
- PostgreSQL：同上
- 影响范围：所有现有章节自动获得 `locked = false`，无数据丢失

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | 请求体缺少 locked 字段 | 返回错误信息 |
| 404 | chapterId 不存在 | 返回 404 |
| 500 | 数据库更新失败 | 返回 500，记录错误日志 |

## 6. 验证策略

1. 单元测试：ChapterLockButton 组件渲染和点击行为
2. 集成测试：PATCH /chapters/:id/lock 端点正确性
3. auto-director 测试：replan / full_audit 等阶段跳过 locked 章节
4. 端到端测试：章节列表中锁定/解锁 → auto-director 行为验证
