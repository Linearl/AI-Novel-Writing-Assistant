/**
 * REQ-7055: 检索追踪清理
 *
 * 定期清理过期的检索追踪数据：
 * - 定时清理（默认每 6 小时）
 * - 可配置保留天数
 * - 使用 Node.js Timer + unref 避免阻止进程退出
 * - 清理结果日志记录
 */

import { prisma } from "../../db/prisma";
import { ragConfig } from "../../config/rag";

const DEFAULT_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export class RagRetrievalTraceRetention {
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 启动定时清理。
   * @param intervalMs 清理间隔（毫秒），默认 6 小时
   */
  start(intervalMs?: number): void {
    if (this.timer) {
      return; // 已经启动
    }
    const interval = intervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    this.timer = setInterval(() => {
      void this.clearExpiredTraces().catch((error) => {
        console.warn("[RagRetrievalTraceRetention] 清理失败：", error);
      });
    }, interval);
    this.timer.unref?.(); // 不阻塞进程退出
    console.log(`[RagRetrievalTraceRetention] 已启动，间隔 ${Math.round(interval / 60000)} 分钟，保留 ${ragConfig.retrievalTraceRetentionDays} 天`);
  }

  /** 停止定时清理 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 清理过期追踪记录。
   * @param now 当前时间（用于测试）
   * @returns 删除数量和截止时间
   */
  async clearExpiredTraces(now: Date = new Date()): Promise<{ deletedCount: number; cutoff: Date }> {
    const retentionDays = ragConfig.retrievalTraceRetentionDays;
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.ragRetrievalTrace.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      console.log(`[RagRetrievalTraceRetention] 清理完成：删除 ${result.count} 条记录，截止 ${cutoff.toISOString()}`);
    }

    return {
      deletedCount: result.count,
      cutoff,
    };
  }

  /** 检查定时器是否正在运行 */
  get isRunning(): boolean {
    return this.timer !== null;
  }
}

/** 全局单例 */
export const ragRetrievalTraceRetention = new RagRetrievalTraceRetention();
