---
description: "REQ-7039 散点小修复需求"
---

# REQ-7039：散点小修复合集

## ARCH-005: structuredInvoke 分层违规

将 `toText` 等纯工具函数从 `services/novel/novelP0Utils.ts` 抽取到 `server/src/platform/`，消除 `llm/ → services/novel/` 的反向依赖。

## ARCH-009: Express 路由定义移出 services/

文件 `services/novel/director/http/novelDirector.ts` → `routes/novelDirector.ts`，更新 `app.ts` 一个 import 行。

## ARCH-023: GET /history 改为 501

保持现有路由但返回 `501 Not Implemented` + 说明"前端 IndexedDB 存储历史" 的 JSON 消息。加 TODO 注释。

## ARCH-024: POST → GET 连接测试

`router.post("/model-routes/connectivity", ...)` → `router.get(...)`，保持 REST 语义。

## STA-025: setInterval → 递归 setTimeout

`startHighMemoryReservationRenewal` 中 `setInterval` 改为递归 `setTimeout`，等上次 renew 完成再设下一次。

## PERF-003: modelRouteConfig 全量预载

启动时 `listModelRouteConfigs()` 一次加载到 `Map`，`resolveModel()` 从 Map 读取，`saveModelRouteConfig()` 同时更新 Map。

## COMPAT-004 + PERF-007: 降级

不修改代码。在复核报告中标记 P4，后续有需求时再评估。
