---
description: "REQ-7004 JSON 软引用 FK 缺失修复 — 任务拆解"
---

# REQ-7004 Tasks

## 阶段一：P0 时间线领域边表（核心）

### T1.1 新增 TimelineEventEdge Prisma 模型
- 新增 `TimelineEventEdge` 模型（sourceId, targetId, edgeType: prerequisite/consequence/forbidden）
- FK 约束 + 唯一约束 + 级联删除
- **DoD**：prisma validate 通过
- **验证**：`pnpm typecheck`

### T1.2 新增时间线参与者/势力边表
- 新增 `TimelineEventParticipant`（eventId ↔ characterId）
- 新增 `TimelineEventFaction`（eventId ↔ factionId）
- **DoD**：prisma validate 通过

### T1.3 新增锚点/Hook/约束边表
- 新增 `TimelineAnchorEventLink`（anchorId ↔ eventLinkType ↔ eventId）
- 新增 `TimelineHookEventLink`（hookId ↔ eventId）
- 新增 `TimelineHookParticipant`（hookId ↔ characterId）
- 新增 `TimelineConstraintLink`（constraintId ↔ refType ↔ refId）
- **DoD**：prisma validate 通过

### T1.4 编写数据迁移脚本
- 遍历存量 StoryTimelineEvent，解析 JSON 数组，写入新边表
- 遍历存量 ChapterTimeAnchor / TimelineHook / TimelineConstraint 同理
- 迁移后校验：JSON 元素总数 == 边表行数
- **DoD**：迁移脚本可执行，校验通过
- **验证**：手动运行迁移脚本 + 校验输出

### T1.5 适配 timeline.repository.ts
- 修改 `mapTimelineEvent` / `mapAnchor` / `mapTimelineHook` / `mapTimelineConstraint`
- 从边表查询替代 JSON 解析
- 保持返回类型不变
- **DoD**：`pnpm typecheck` 通过
- **验证**：`pnpm --filter @ai-novel/server test`

### T1.6 移除旧 JSON 字段
- 从 Prisma schema 移除已迁移的 `*IdsJson` 字段
- 生成迁移
- **DoD**：prisma validate 通过
- **验证**：`pnpm typecheck` + `pnpm test`

## 阶段二：P1 世界设定领域

### T2.1 新增世界关系 Prisma 模型
- 新增 `WorldForceRelation` 表（sourceForceId, targetForceId, relation, tension, detail）
- 新增 `WorldLocationControl` 表（forceId, locationId, relation, detail）
- 新增 `WorldLocationConnection` 表（sourceLocationId, targetLocationId, connectionType, distanceHint, narrativeUse）
- **DoD**：prisma validate 通过

### T2.2 编写 World 数据迁移脚本
- 解析 `World.structureJson`，提取关系数据写入新表
- **DoD**：迁移脚本可执行

### T2.3 适配 worldStructure / worldVisualization
- 修改 `worldStructure.ts` 写入逻辑：同时写新表 + 旧 JSON（过渡期）
- 修改 `worldVisualization.ts` 读取逻辑：从新表读取
- **DoD**：`pnpm typecheck` 通过
- **验证**：前端世界可视化正常

### T2.4 移除 World.structureJson 中的关系数据
- 确认无其他消费方后，从 structureJson 移除 relations 字段
- **DoD**：typecheck + test 通过

## 阶段三：P2 其他零散字段

### T3.1 新增零散边表
- `OpenConflictCharacter`（conflictId ↔ characterId）
- `CharacterResourceKnownBy`（resourceId ↔ characterId）
- `StoryPlanIssue`（planId ↔ issueId）
- `StateVersionProposal`（versionId ↔ proposalId）
- **DoD**：prisma validate 通过

### T3.2 迁移 + 适配 + 移除旧字段
- 迁移脚本 + 服务层适配 + 移除旧 JSON 字段
- **DoD**：typecheck + test + build 全绿

## 阶段四：收尾验证

### T4.1 全量验证
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- **DoD**：三项全绿

### T4.2 回归验证
- 对比迁移前后 API 响应格式
- 验证级联删除行为
- **DoD**：验收条目 E1-E7 全部通过


---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-30 | 阶段一 P0 时间线边表开发完成 | ✅ |

---

## 完成判定

- 阶段一（P0）全部完成，阶段二三已由 REQ-7005/7007 完成。
