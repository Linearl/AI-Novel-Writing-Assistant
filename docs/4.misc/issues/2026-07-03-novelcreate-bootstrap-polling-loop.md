---
description: NovelCreate.tsx 中 useEffect + setSearchParams 形成无限循环，bootstrap 接口被以 ~1200 req/s 的速率疯狂调用
---

# NovelCreate bootstrap 轮询死循环

## 问题描述

`NovelCreate.tsx` 中 `restoreWorkflowMutation` 的 `useEffect` 与 `onSuccess` 中的 `setSearchParams` 形成循环依赖，导致 `POST /api/novel-workflows/bootstrap` 被以约 1200 次/秒的速率反复调用。

## 影响

1. **服务端资源浪费**：每秒上千次无意义的 bootstrap POST 请求持续消耗 Express 连接、Prisma 查询和数据库连接池，造成不必要的 CPU 和内存压力
2. **数据库负载**：bootstrap 每次调用都会查询（甚至创建）workflow task 记录，高频触发下对 SQLite/PostgreSQL 产生显著写入压力
3. **潜在的 task 膨胀**：当守卫失效时（竞态条件下 `task.id !== workflowTaskIdFromQuery` 不成立），服务端可能反复创建新 task 记录，污染任务列表
4. **未来接入限流后的阻断风险**：目前项目未做 rate limiting，该循环表现为性能问题。一旦接入限流，循环会在数十秒内耗尽配额，导致推进、重试等核心操作被 429 拒绝，从性能问题升级为功能阻断

## 根因

`client/src/pages/novels/NovelCreate.tsx` 第 86-126 行：

```typescript
const restoreWorkflowMutation = useMutation({
    mutationFn: () => bootstrapNovelWorkflow({ ... }),
    onSuccess: (response) => {
        // ...
        if (task.id !== workflowTaskIdFromQuery) {
            setSearchParams((prev) => {  // ← 触发重新渲染
                next.set("workflowTaskId", task.id);
                return next;
            }, { replace: true });
        }
    },
});

useEffect(() => {
    // ...
    restoreWorkflowMutation.mutate();  // ← 再次触发
}, [workflowTaskIdFromQuery, workflowMode]);  // ← setSearchParams 改变了这个依赖
```

循环路径：
1. `useEffect` 检测到 `workflowTaskIdFromQuery` 变化 → 调用 `mutate()`
2. mutation `onSuccess` 中 `setSearchParams` 更新 URL 参数
3. `searchParams` 变化导致 `workflowTaskIdFromQuery` 重新计算
4. `useEffect` 依赖变化 → 回到步骤 1

虽然有 `task.id !== workflowTaskIdFromQuery` 守卫，但在竞态条件下（mutation 还没返回就触发了下一次 effect）守卫失效。

## 复现步骤

1. 访问 `/novels/create?workflowTaskId=xxx&mode=director`
2. 打开浏览器 DevTools Network 面板
3. 观察到 `POST /api/novel-workflows/bootstrap` 持续高频发送（每秒数百至上千次）

## 建议修复

在 `useEffect` 中用 `useRef` 记录已发送的 key，避免重复触发：

```typescript
const lastBootstrapRef = useRef<string>("");

useEffect(() => {
    if (!workflowTaskIdFromQuery) {
        lastBootstrapRef.current = "";
        // ...
        return;
    }
    const dedupeKey = `${workflowTaskIdFromQuery}:${workflowMode ?? ""}`;
    if (lastBootstrapRef.current === dedupeKey) {
        return;
    }
    lastBootstrapRef.current = dedupeKey;
    restoreWorkflowMutation.mutate();
}, [workflowTaskIdFromQuery, workflowMode]);
```

## 环境

- 项目版本：latest (main branch)
- 文件：`client/src/pages/novels/NovelCreate.tsx`
- 发现日期：2026-07-03
