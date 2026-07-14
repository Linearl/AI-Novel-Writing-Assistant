import { useCallback, useEffect, useRef, useState } from "react";
import {
  batchStyleDetect,
  batchStylePolish,
  cancelBatchPolish,
  getBatchPolishProgress,
  type BatchDetectionResult,
  type BatchPolishJobProgress,
} from "@/api/batchStyle";
import { toast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatchPolishPhase = "idle" | "detecting" | "polishing" | "done" | "error" | "cancelled";

export interface UseBatchPolishOptions {
  novelId: string;
  pollingIntervalMs?: number;
  riskThreshold?: number;
  autoApply?: boolean;
}

export interface UseBatchPolishReturn {
  phase: BatchPolishPhase;
  detectionResult: BatchDetectionResult | null;
  jobId: string | null;
  jobProgress: BatchPolishJobProgress | null;
  error: string | null;
  startDetection: (chapterIds?: string[]) => Promise<void>;
  startPolish: (chapterIds?: string[]) => Promise<void>;
  cancelJob: () => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const DEFAULT_POLL_INTERVAL = 3000;
const DEFAULT_RISK_THRESHOLD = 35;
const DEFAULT_AUTO_APPLY = true;

export function useBatchPolish(options: UseBatchPolishOptions): UseBatchPolishReturn {
  const {
    novelId,
    pollingIntervalMs = DEFAULT_POLL_INTERVAL,
    riskThreshold = DEFAULT_RISK_THRESHOLD,
    autoApply = DEFAULT_AUTO_APPLY,
  } = options;

  const [phase, setPhase] = useState<BatchPolishPhase>("idle");
  const [detectionResult, setDetectionResult] = useState<BatchDetectionResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<BatchPolishJobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const startDetection = useCallback(async (chapterIds?: string[]) => {
    setPhase("detecting");
    setError(null);
    setDetectionResult(null);
    try {
      const result = await batchStyleDetect(novelId, { chapterIds });
      setDetectionResult(result);
      setPhase("idle");
      toast.success(
        `检测完成`,
        { description: `共检测 ${result.chapterCount} 章，发现 ${result.totalViolations} 处问题。` },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "检测失败";
      setError(message);
      setPhase("error");
      toast.error("批量检测失败", { description: message });
    }
  }, [novelId]);

  const pollProgress = useCallback((currentJobId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const progress = await getBatchPolishProgress(novelId, currentJobId);
        setJobProgress(progress);

        if (progress.status === "done" || progress.status === "cancelled" || progress.status === "error") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPhase(progress.status === "done" ? "done" : progress.status === "cancelled" ? "cancelled" : "error");
        }
      } catch {
        // Silently retry on transient errors
      }
    }, pollingIntervalMs);
  }, [novelId, pollingIntervalMs]);

  const startPolish = useCallback(async (chapterIds?: string[]) => {
    setPhase("polishing");
    setError(null);
    setJobProgress(null);
    try {
      const result = await batchStylePolish(novelId, { chapterIds, riskThreshold, autoApply });
      setJobId(result.jobId);
      pollProgress(result.jobId);
      toast.success("润色任务已启动", { description: "后台正在逐章处理，请关注进度。" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "启动润色失败";
      setError(message);
      setPhase("error");
      toast.error("批量润色启动失败", { description: message });
    }
  }, [novelId, pollProgress, riskThreshold, autoApply]);

  const cancelJob = useCallback(async () => {
    if (!jobId) return;
    try {
      await cancelBatchPolish(novelId, jobId);
      toast.info("取消请求已发送");
    } catch (err) {
      const message = err instanceof Error ? err.message : "取消失败";
      toast.error("取消任务失败", { description: message });
    }
  }, [novelId, jobId]);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPhase("idle");
    setDetectionResult(null);
    setJobId(null);
    setJobProgress(null);
    setError(null);
  }, []);

  return {
    phase,
    detectionResult,
    jobId,
    jobProgress,
    error,
    startDetection,
    startPolish,
    cancelJob,
    reset,
  };
}
