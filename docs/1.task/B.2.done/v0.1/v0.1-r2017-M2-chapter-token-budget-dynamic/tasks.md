---
description: "REQ-2017 任务拆解"
---

# REQ-2017 任务拆解

> 最后更新：2026-06-26T23:30:00+08:00

---

## 阶段一：阈值计算函数

- [ ] 1.1 新增 `computeChapterTotalTokenLimit(targetWordCount?: number | null): number` 
- [ ] 1.2 单元测试：null → 120K；2000字 → 120K；4000字 → 120K；8000字 → 160K

## 阶段二：渐进超限逻辑

- [ ] 2.1 `recordChapterUsageBudgetExceededSignal` 改为渐进式：第 1 次 `closed` + 记录计数，达到 `usageAnomalyOpenAt` 后才 `open`
- [ ] 2.2 函数签名增加 `targetWordCount` 参数
- [ ] 2.3 超限消息包含动态阈值信息

## 阶段三：调用方适配

- [ ] 3.1 `resolveUsageCircuitBreaker` 获取章节 `targetWordCount` 并传入

## 阶段四：验证

- [ ] 4.1 类型检查：`pnpm typecheck`
- [ ] 4.2 单测：`pnpm --filter @ai-novel/server test -- --testPathPattern=DirectorCircuitBreaker`
