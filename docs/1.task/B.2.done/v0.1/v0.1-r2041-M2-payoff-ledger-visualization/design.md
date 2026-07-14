---
description: "REQ-2041 伏笔埋收可视化追踪 方案设计"
update_time: 2026-07-03
---

# REQ-2041 方案设计

## 1. 方案概述

采用"类型增强 + 服务扩展 + auto-director 钩子 + 前端面板"的四层实现方案。在现有 payoff ledger 数据结构基础上增量增强，通过 auto-director 的章节生成前后钩子实现伏笔自动感知，前端新增伏笔追踪面板提供可视化交互。

### 1.1 设计目标

1. 最小化对现有 payoff ledger 结构的破坏——增量字段增强，保留向后兼容
2. auto-director 无缝集成——利用现有钩子机制，不改变生成流水线
3. UI 简洁实用——聚焦伏笔状态追踪，不过度设计

### 1.2 关键决策

1. **状态 4 值枚举**：planted/active/resolved/expired，从现有 6 值收敛，通过 normalizedStatus 字段兼容
2. **过期阈值可配置**：默认 20 章，用户可通过 settings 调整
3. **AI 检测 + 用户确认**：伏笔检测由 LLM 完成，低置信度结果需用户确认
4. **回收提醒有限注入**：最多注入 5 条最紧迫的过期伏笔，避免 token 浪费

### 1.3 不在范围

- 伏笔关系图谱
- AI 自动撰写回收内容
- 伏笔重要性自动评分

## 2. 实现细节

### 2.1 数据模型变更

#### 2.1.1 PayoffLedger 条目增强

在 `shared/types/chapterRuntime.ts` 的 `runtimePayoffLedgerItemSchema` 基础上新增字段：

```typescript
// 新增字段（增量，不删除现有字段）
plannedChapterId: z.string().nullable().optional(),    // 埋设章节 ID
resolvedChapterId: z.string().nullable().optional(),    // 回收章节 ID
plantedAt: z.string().nullable().optional(),            // 埋设时间 ISO 8601
resolvedAt: z.string().nullable().optional(),           // 回收时间 ISO 8601
chaptersElapsed: z.number().default(0),                 // 跨越章节数
normalizedStatus: z.enum(["planted", "active", "resolved", "expired"]),  // 新标准状态
```

#### 2.1.2 状态枚举映射

| 旧状态 (currentStatus) | 新标准状态 (normalizedStatus) |
| ---- | ---- |
| setup | planted |
| hinted | planted |
| pending_payoff | active |
| paid_off | resolved |
| failed | resolved |
| overdue | expired |

#### 2.1.3 过期阈值配置

在小说设置中增加配置项：

```typescript
// novel settings
payoffExpiryThreshold: z.number().default(20)  // 跨越多少章触发过期
```

### 2.2 后端

#### 2.2.1 API 端点

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/novels/:novelId/payoff-ledger` | 查询伏笔列表（支持 `?status=planted` 筛选） |
| POST | `/api/novels/:novelId/payoff-ledger` | 创建伏笔条目 |
| PATCH | `/api/payoff-ledger/:itemId` | 更新伏笔条目 |

**GET 请求参数**：

```typescript
interface PayoffLedgerQuery {
  status?: "planted" | "active" | "resolved" | "expired"  // 可选筛选
  page?: number      // 分页，默认 1
  pageSize?: number  // 每页条数，默认 20
}
```

**POST 请求体**：

```typescript
interface CreatePayoffLedgerItem {
  title: string                    // 伏笔标题/描述
  description?: string             // 详细描述
  plannedChapterId?: string        // 埋设章节 ID
  novelId: string                  // 小说 ID
}
```

#### 2.2.2 auto-director 伏笔埋设检测

**触发时机**：章节生成完成后（after chapter generation hook）

**流程**：
1. 获取刚生成的章节内容
2. 调用 LLM（伏笔检测 prompt）分析内容，提取伏笔候选
3. 与现有伏笔条目去重（标题相似度 > 0.8 视为重复）
4. 新伏笔写入 ledger，状态为 planted
5. 更新章节的 `payoffRefs` 字段

**Prompt 注册位置**：`server/src/prompting/` 中新增 `payoffDetectionPrompt`，实现 `PromptAsset` 接口。

#### 2.2.3 auto-director 未回收伏笔提醒

**触发时机**：章节生成前（before chapter generation hook）

**流程**：
1. 查询当前小说所有 planted/active 状态伏笔
2. 计算每条伏笔的 `chaptersElapsed`（当前最新章节序号 - 埋设章节序号）
3. 按 chaptersElapsed 降序排序
4. 选取前 5 条（最紧迫的）注入生成上下文
5. 注入格式：`以下伏笔需要在本章或近期章节中回收：[列表]`

#### 2.2.4 集成点

```
章节生成流水线:
  [章节生成前] → 伏笔检查 → 注入回收提醒 → [章节内容生成] → [章节生成后] → 伏笔检测 → 写入 ledger
```

与现有 `PayoffLedgerSyncService` 的关系：
- 现有 sync 服务负责审计后同步
- 新增逻辑负责章节生成前后的实时检测
- 两者共享同一张 payoff ledger 表，不冲突

### 2.3 前端

#### 2.3.1 伏笔追踪面板

**位置**：小说详情页的工具面板区域（与现有角色面板、世界观面板平级）

**组件结构**：

```
client/src/pages/novels/components/
├── PayoffLedgerPanel.tsx          # 伏笔追踪面板（新增）
│   ├── PayoffLedgerFilters.tsx     # 状态筛选栏（新增）
│   ├── PayoffLedgerItem.tsx        # 单条伏笔展示（新增）
│   └── PayoffExpirySettings.tsx    # 过期阈值配置（新增）
```

**面板内容**：

```
┌─────────────────────────────────────────┐
│  伏笔追踪                    [筛选 ▾]   │
├─────────────────────────────────────────┤
│  🟢 已埋设  🟡 进行中  🔴 已回收  ⚫ 过期 │
├─────────────────────────────────────────┤
│  ▪ "龙纹玉佩的秘密"           已埋设    │
│    埋设：第3章 - 意外获得         跨越 15 章 │
│                                         │
│  ▪ "叛徒的真实身份"           进行中    │
│    埋设：第7章 - 可疑行为         跨越 11 章 │
│                                         │
│  ▪ "消失的第三把钥匙"         ⚠️ 过期    │
│    埋设：第2章 - 线索提及         跨越 23 章 │
│    ⚠️ 已超过 20 章未回收              │
├─────────────────────────────────────────┤
│  显示 3 条伏笔（2 条未回收）            │
└─────────────────────────────────────────┘
```

#### 2.3.2 状态视觉标识

| 状态 | 颜色 | 图标 |
| ---- | ---- | ---- |
| planted | 绿色 | 🟢 |
| active | 黄色/橙色 | 🟡 |
| resolved | 蓝色/灰色 | 🔵 |
| expired | 红色 + 警告图标 | ⚠️ |

#### 2.3.3 API 调用

使用 TanStack Query 管理伏笔数据：

```typescript
// hooks
usePayoffLedger(novelId, { status?: string })  // 查询伏笔列表
useCreatePayoffLedgerItem()                     // 创建伏笔
useUpdatePayoffLedgerItem()                     // 更新伏笔
```

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 | Content-Type |
| ---- | ---- | ---- | ------------ |
| GET | `/api/novels/:novelId/payoff-ledger` | 查询伏笔列表 | - |
| POST | `/api/novels/:novelId/payoff-ledger` | 创建伏笔条目 | application/json |
| PATCH | `/api/payoff-ledger/:itemId` | 更新伏笔条目 | application/json |

### 3.2 响应格式

```json
{
  "items": [...],
  "total": 15,
  "page": 1,
  "pageSize": 20,
  "summary": {
    "planted": 3,
    "active": 2,
    "resolved": 8,
    "expired": 2
  }
}
```

## 4. 数据模型

### 4.1 新增字段汇总

| 表 | 字段 | 类型 | 默认值 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| PayoffLedgerItem | plannedChapterId | String? | null | 埋设伏笔的章节 ID |
| PayoffLedgerItem | resolvedChapterId | String? | null | 回收伏笔的章节 ID |
| PayoffLedgerItem | plantedAt | String? | null | 埋设时间 ISO 8601 |
| PayoffLedgerItem | resolvedAt | String? | null | 回收时间 ISO 8601 |
| PayoffLedgerItem | chaptersElapsed | Int | 0 | 跨越章节数 |
| NovelSettings | payoffExpiryThreshold | Int | 20 | 过期告警阈值 |

### 4.2 迁移影响

- PayoffLedgerItem 表新增字段均为 nullable 或有默认值，不影响现有数据
- NovelSettings 表新增字段有默认值

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | 请求体缺少必填字段 | 返回错误信息 |
| 404 | itemId 不存在 | 返回 404 |
| 404 | novelId 不存在 | 返回 404 |
| 500 | 数据库操作失败 | 返回 500，记录错误日志 |
| 422 | 伏笔检测 LLM 调用失败 | 跳过本次检测，记录日志，不影响章节生成 |

## 6. 验证策略

1. 单元测试：伏笔状态自动更新逻辑、过期检测逻辑
2. 集成测试：CRUD API 端点正确性、auto-director 钩子触发
3. E2E 测试：伏笔追踪面板交互、状态筛选、过期告警展示
