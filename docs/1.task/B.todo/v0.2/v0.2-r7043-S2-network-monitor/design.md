---
description: "REQ-7043: 网络状态监控 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7043: 网络状态监控 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/llm/` 目录下新增 `networkMonitor.ts`，复用现有 `connectivity.ts` 的探测能力。

```
调用链路：
服务启动
  ↓
NetworkMonitor.start()         // 启动心跳定时器
  ↓
setInterval(heartbeat, 30s)    // 定时执行心跳
  ↓
testPlainConnection()          // 复用 connectivity.ts 探测
  ↓
状态判定（连续3次失败=断网）
  ↓
novelEventBus.emit()           // 发布 network:online/offline 事件
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/llm/networkMonitor.ts

interface NetworkMonitorConfig {
  heartbeatIntervalMs: number;    // 默认 30000（30秒）
  failureThreshold: number;       // 默认 3（连续失败次数）
  recoveryThreshold: number;      // 默认 1（连续成功次数）
  probeTimeoutMs: number;         // 默认 10000（探测超时）
  maxRecentProbes: number;        // 默认 10（保留最近N次记录）
}

interface ProbeRecord {
  timestamp: string;
  ok: boolean;
  latency: number | null;
  error: string | null;
}

interface NetworkState {
  isOnline: boolean;
  lastCheckAt: string;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  recentProbes: ProbeRecord[];
}
```

## 2. 详细设计

### 2.1 心跳探测逻辑

```typescript
// server/src/llm/networkMonitor.ts

import { llmConnectivityService } from "./connectivity";
import { novelEventBus } from "../events/EventBus";

class NetworkMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: NetworkState;
  private config: NetworkMonitorConfig;

  constructor(config: Partial<NetworkMonitorConfig> = {}) {
    this.config = {
      heartbeatIntervalMs: 30_000,
      failureThreshold: 3,
      recoveryThreshold: 1,
      probeTimeoutMs: 10_000,
      maxRecentProbes: 10,
      ...config,
    };
    this.state = {
      isOnline: true,  // 假设在线，首次探测后更新
      lastCheckAt: new Date().toISOString(),
      lastSuccessAt: null,
      consecutiveFailures: 0,
      recentProbes: [],
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.heartbeat(), this.config.heartbeatIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getState(): Readonly<NetworkState> {
    return { ...this.state };
  }

  private async heartbeat(): Promise<void> {
    try {
      const result = await llmConnectivityService.testConnection({
        provider: /* 当前默认 provider */,
        probeMode: "plain",
      });

      const probe: ProbeRecord = {
        timestamp: new Date().toISOString(),
        ok: result.ok,
        latency: result.latency,
        error: result.error,
      };

      this.updateState(probe);
    } catch (error) {
      const probe: ProbeRecord = {
        timestamp: new Date().toISOString(),
        ok: false,
        latency: null,
        error: error instanceof Error ? error.message : "心跳探测异常",
      };
      this.updateState(probe);
    }
  }

  private updateState(probe: ProbeRecord): void {
    const wasOnline = this.state.isOnline;

    // 更新环形缓冲
    this.state.recentProbes.push(probe);
    if (this.state.recentProbes.length > this.config.maxRecentProbes) {
      this.state.recentProbes.shift();
    }

    this.state.lastCheckAt = probe.timestamp;

    if (probe.ok) {
      this.state.consecutiveFailures = 0;
      this.state.lastSuccessAt = probe.timestamp;

      // 恢复判定
      if (!wasOnline) {
        this.state.isOnline = true;
        this.emitEvent("network:online", {
          reason: "连续探测成功",
          lastSuccessAt: probe.timestamp,
          probeLatency: probe.latency,
        });
      }
    } else {
      this.state.consecutiveFailures++;

      // 断网判定
      if (wasOnline && this.state.consecutiveFailures >= this.config.failureThreshold) {
        this.state.isOnline = false;
        this.emitEvent("network:offline", {
          reason: probe.error ?? "连续探测失败",
          lastSuccessAt: this.state.lastSuccessAt ?? undefined,
        });
      }
    }
  }

  private emitEvent(type: "network:online" | "network:offline", data: {
    reason: string;
    lastSuccessAt?: string;
    probeLatency?: number;
  }): void {
    novelEventBus.emit({
      type,
      payload: {
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  }
}

export const networkMonitor = new NetworkMonitor();
```

### 2.2 事件类型定义

```typescript
// server/src/events/types.ts 新增

// NovelEvent 联合类型新增：
| { type: "network:online"; payload: NetworkOnlinePayload }
| { type: "network:offline"; payload: NetworkOfflinePayload }

interface NetworkOnlinePayload {
  timestamp: string;
  reason: string;
  lastSuccessAt: string;
  probeLatency: number | null;
}

interface NetworkOfflinePayload {
  timestamp: string;
  reason: string;
  lastSuccessAt?: string;
}
```

### 2.3 API 接口

```typescript
// 新增路由：server/src/modules/llm/http/network.ts

import { Router } from "express";
import { networkMonitor } from "../../../llm/networkMonitor";

const router = Router();

router.get("/api/network/status", (_req, res) => {
  const state = networkMonitor.getState();
  res.json({
    success: true,
    data: state,
  });
});

export default router;
```

### 2.4 集成到应用启动

```typescript
// server/src/app.ts 修改

import { networkMonitor } from "./llm/networkMonitor";

// 在服务启动后调用
networkMonitor.start();

// 在进程退出时清理
process.on("SIGTERM", () => networkMonitor.stop());
process.on("SIGINT", () => networkMonitor.stop());
```

## 3. 数据模型

### 3.1 状态数据结构

```typescript
// 内存数据结构
interface NetworkState {
  isOnline: boolean;
  lastCheckAt: string;          // ISO 时间戳
  lastSuccessAt: string | null; // ISO 时间戳
  consecutiveFailures: number;  // 当前连续失败次数
  recentProbes: ProbeRecord[];  // 最近 N 次探测记录
}

interface ProbeRecord {
  timestamp: string;
  ok: boolean;
  latency: number | null;       // ms
  error: string | null;
}
```

### 3.2 事件负载

```typescript
interface NetworkOnlinePayload {
  timestamp: string;
  reason: string;
  lastSuccessAt: string;
  probeLatency: number | null;
}

interface NetworkOfflinePayload {
  timestamp: string;
  reason: string;
  lastSuccessAt?: string;
}
```

## 4. 接口设计

### 4.1 内部接口

```typescript
// 网络监控器
export class NetworkMonitor {
  start(): void;
  stop(): void;
  getState(): Readonly<NetworkState>;
}

// 单例导出
export const networkMonitor: NetworkMonitor;
```

### 4.2 API 接口

```typescript
// GET /api/network/status
// Response: { success: boolean; data: NetworkState }
```

## 5. 实现步骤

### Phase 1: 核心心跳逻辑（0.15天）

1. 新增 `server/src/llm/networkMonitor.ts`
2. 实现 `NetworkMonitor` 类
3. 实现心跳定时器和状态判定

### Phase 2: 事件发布（0.1天）

1. 扩展 `server/src/events/types.ts` 新增网络事件类型
2. 在 `EventBus` 的 `summarizePayload` 中处理新事件类型
3. 集成事件发布到 `NetworkMonitor`

### Phase 3: API 接口（0.1天）

1. 新增 `server/src/modules/llm/http/network.ts`
2. 在 `app.ts` 中挂载路由

### Phase 4: 集成与测试（0.15天）

1. 在 `app.ts` 中启动/停止心跳
2. 编写单元测试
3. 编写集成测试

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 心跳被限流 | 误判断网 | 低 | 使用最小 token，间隔 >= 15 秒 |
| 状态频繁切换 | 系统抖动 | 中 | 连续失败 3 次才判定 |
| 定时器泄漏 | 内存增长 | 低 | 进程退出时清理 |
| Provider 临时不可用 | 误判断网 | 中 | 可配置为检测多个 provider |

## 7. 测试计划

### 7.1 单元测试

```typescript
// 测试场景
describe('NetworkMonitor', () => {
  it('should transition to offline after 3 consecutive failures', async () => {
    // 模拟连续3次探测失败
    // 验证 isOnline 变为 false
    // 验证发布 network:offline 事件
  });

  it('should transition to online after recovery', async () => {
    // 从 offline 状态开始
    // 模拟1次成功探测
    // 验证 isOnline 变为 true
    // 验证发布 network:online 事件
  });

  it('should reset failure count on success', async () => {
    // 模拟2次失败，1次成功，1次失败
    // 验证不触发断网（未达到连续3次）
  });

  it('should maintain recent probes buffer', async () => {
    // 执行12次心跳
    // 验证只保留最近10次记录
  });

  it('should cleanup timer on stop', async () => {
    // 启动后停止
    // 验证定时器被清理
  });
});
```

### 7.2 集成测试

```typescript
// 测试场景
describe('Network Monitor API', () => {
  it('should return current network status', async () => {
    // 调用 GET /api/network/status
    // 验证返回正确的状态结构
  });
});
```

## 8. 交付物

- [ ] `server/src/llm/networkMonitor.ts` — 网络监控器
- [ ] `server/src/events/types.ts` — 新增网络事件类型
- [ ] `server/src/modules/llm/http/network.ts` — API 路由
- [ ] `server/src/app.ts` — 集成启动/停止
- [ ] `server/tests/llm/networkMonitor.test.ts` — 单元测试
- [ ] `server/tests/modules/llm/network.test.ts` — API 测试
