import { llmConnectivityService } from "./connectivity";
import type { LLMProvider } from "@ai-novel/shared";
import { novelEventBus } from "../events/EventBus";
import { logger } from "../services/logging/LoggerService";

// ── 配置 ────────────────────────────────────────────

export interface NetworkMonitorConfig {
  /** 心跳间隔（毫秒），默认 30000 */
  heartbeatIntervalMs: number;
  /** 连续失败次数阈值判定断网，默认 3 */
  failureThreshold: number;
  /** 连续成功次数阈值判定恢复，默认 1 */
  recoveryThreshold: number;
  /** 探测超时（毫秒），默认 10000 */
  probeTimeoutMs: number;
  /** 保留最近探测记录数，默认 10 */
  maxRecentProbes: number;
  /** 心跳探测使用的 LLM provider */
  provider: LLMProvider;
}

// ── 数据类型 ─────────────────────────────────────────

export interface ProbeRecord {
  timestamp: string;
  ok: boolean;
  latency: number | null;
  error: string | null;
}

export interface NetworkState {
  isOnline: boolean;
  lastCheckAt: string;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  recentProbes: ProbeRecord[];
}

// ── 默认配置 ─────────────────────────────────────────

const DEFAULT_CONFIG: NetworkMonitorConfig = {
  heartbeatIntervalMs: 30_000,
  failureThreshold: 3,
  recoveryThreshold: 1,
  probeTimeoutMs: 10_000,
  maxRecentProbes: 10,
  provider: "deepseek",
};

// ── 核心类 ───────────────────────────────────────────

export class NetworkMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: NetworkState;
  private config: NetworkMonitorConfig;
  private running = false;

  constructor(config: Partial<NetworkMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isOnline: true,
      lastCheckAt: new Date().toISOString(),
      lastSuccessAt: null,
      consecutiveFailures: 0,
      recentProbes: [],
    };
  }

  // ── 生命周期 ──────────────────────────────────────

  /** 启动后台心跳定时器 */
  start(): void {
    if (this.timer) return;
    logger.info("[network-monitor] 启动", {
      interval: this.config.heartbeatIntervalMs,
      provider: this.config.provider,
    });
    this.timer = setInterval(() => void this.heartbeat(), this.config.heartbeatIntervalMs);
    void this.heartbeat();
  }

  /** 停止后台心跳定时器 */
  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    logger.info("[network-monitor] 已停止");
  }

  // ── 查询接口 ──────────────────────────────────────

  /** 获取当前网络状态快照（只读副本） */
  getState(): Readonly<NetworkState> {
    return {
      ...this.state,
      recentProbes: [...this.state.recentProbes],
    };
  }

  /**
   * 测试用：直接注入探测结果，绕过实际 LLM 调用。
   * 仅在测试环境中使用，生产代码不应依赖此方法。
   */
  injectProbe(probe: ProbeRecord): void {
    this.updateState(probe);
  }

  // ── 心跳内部逻辑 ──────────────────────────────────

  private async heartbeat(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const probe = await this.executeProbe();
      this.updateState(probe);
    } finally {
      this.running = false;
    }
  }

  private async executeProbe(): Promise<ProbeRecord> {
    try {
      const result = await llmConnectivityService.testConnection({
        provider: this.config.provider,
        probeMode: "plain",
      });
      return {
        timestamp: new Date().toISOString(),
        ok: result.ok,
        latency: result.latency,
        error: result.error,
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        ok: false,
        latency: null,
        error: error instanceof Error ? error.message : "心跳探测异常",
      };
    }
  }

  private updateState(probe: ProbeRecord): void {
    const wasOnline = this.state.isOnline;

    // 更新环形缓冲
    this.state.recentProbes.push(probe);
    if (this.state.recentProbes.length > this.config.maxRecentProbes) {
      this.state.recentProbes = this.state.recentProbes.slice(-this.config.maxRecentProbes);
    }

    this.state.lastCheckAt = probe.timestamp;

    if (probe.ok) {
      this.state.consecutiveFailures = 0;
      this.state.lastSuccessAt = probe.timestamp;

      if (!wasOnline) {
        this.state.isOnline = true;
        logger.warn("[network-monitor] 网络已恢复", {
          lastSuccessAt: probe.timestamp,
          probeLatency: probe.latency,
        });
        this.emitOnline(probe);
      }
    } else {
      this.state.consecutiveFailures++;

      if (wasOnline && this.state.consecutiveFailures >= this.config.failureThreshold) {
        this.state.isOnline = false;
        logger.error("[network-monitor] 网络已断开", {
          reason: probe.error ?? "连续探测失败",
          consecutiveFailures: this.state.consecutiveFailures,
          lastSuccessAt: this.state.lastSuccessAt,
        });
        this.emitOffline(probe);
      }
    }
  }

  // ── 事件发布 ──────────────────────────────────────

  private emitOnline(probe: ProbeRecord): void {
    novelEventBus.emit({
      type: "network:online",
      payload: {
        timestamp: new Date().toISOString(),
        reason: "连续探测成功",
        lastSuccessAt: probe.timestamp,
        probeLatency: probe.latency,
      },
    });
  }

  private emitOffline(probe: ProbeRecord): void {
    novelEventBus.emit({
      type: "network:offline",
      payload: {
        timestamp: new Date().toISOString(),
        reason: probe.error ?? "连续探测失败",
        lastSuccessAt: this.state.lastSuccessAt ?? undefined,
      },
    });
  }
}

// ── 单例导出 ─────────────────────────────────────────

export const networkMonitor = new NetworkMonitor();
