import { useMemo } from "react";
import type { CreativeHubStreamFrame } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";

interface RunStep {
  id: string;
  toolName: string;
  model?: string;
  status: "running" | "success" | "failed";
  durationMs?: number;
  tokenUsage?: { prompt?: number; completion?: number; total?: number };
  costUsd?: number;
  errorCode?: string;
  outputSummary?: string;
  startedAt: number;
}

interface CreativeHubRunTrackerProps {
  frames: CreativeHubStreamFrame[];
  isRunning: boolean;
}

function deriveStepsFromFrames(frames: CreativeHubStreamFrame[]): RunStep[] {
  const steps = new Map<string, RunStep>();
  for (const frame of frames) {
    if (frame.event === "creative_hub/tool_call") {
      const { stepId, toolName, model } = frame.data;
      steps.set(stepId ?? toolName, {
        id: stepId ?? toolName,
        toolName,
        model,
        status: "running",
        startedAt: Date.now(),
      });
    }
    if (frame.event === "creative_hub/tool_result") {
      const { stepId, toolName, success, durationMs, tokenUsage, costUsd, errorCode, outputSummary } = frame.data;
      const existing = steps.get(stepId ?? toolName);
      if (existing) {
        existing.status = success ? "success" : "failed";
        existing.durationMs = durationMs;
        existing.tokenUsage = tokenUsage;
        existing.costUsd = costUsd;
        existing.errorCode = errorCode;
        existing.outputSummary = outputSummary;
      } else {
        steps.set(stepId ?? toolName, {
          id: stepId ?? toolName,
          toolName,
          status: success ? "success" : "failed",
          durationMs,
          tokenUsage,
          costUsd,
          errorCode,
          outputSummary,
          startedAt: Date.now(),
        });
      }
    }
  }
  return Array.from(steps.values());
}

function formatDuration(ms?: number): string {
  if (!ms) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatTokens(n?: number): string {
  if (!n) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function CreativeHubRunTracker({ frames, isRunning }: CreativeHubRunTrackerProps) {
  const steps = useMemo(() => deriveStepsFromFrames(frames), [frames]);
  const totalTokens = useMemo(
    () => steps.reduce((sum, s) => sum + (s.tokenUsage?.total ?? 0), 0),
    [steps],
  );
  const successCount = steps.filter((s) => s.status === "success").length;
  const failCount = steps.filter((s) => s.status === "failed").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          执行追踪 {isRunning ? "（运行中）" : steps.length > 0 ? "（已完成）" : ""}
        </span>
        {steps.length > 0 && (
          <span className="text-muted-foreground">
            {successCount}✓ {failCount > 0 ? `${failCount}✗` : ""} · {formatTokens(totalTokens)} tokens
          </span>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          暂无执行记录
        </div>
      ) : (
        <div className="space-y-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 text-xs"
            >
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  step.status === "running"
                    ? "animate-pulse bg-blue-500"
                    : step.status === "success"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{step.toolName}</span>
              {step.model && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {step.model}
                </Badge>
              )}
              {step.durationMs != null && (
                <span className="shrink-0 text-muted-foreground">{formatDuration(step.durationMs)}</span>
              )}
              {step.tokenUsage?.total != null && (
                <span className="shrink-0 text-muted-foreground">{formatTokens(step.tokenUsage.total)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
