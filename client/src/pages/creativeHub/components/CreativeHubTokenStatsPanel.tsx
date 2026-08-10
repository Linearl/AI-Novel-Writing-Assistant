import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fetchNovelTokenStats } from "@/api/tokenUsage";
import type { StepTokenUsageSummary } from "@ai-novel/shared";

interface CreativeHubTokenStatsPanelProps {
  novelId: string | null;
}

const STEP_COLORS: Record<string, string> = {
  draft: "#3b82f6",
  repair: "#f59e0b",
  review: "#8b5cf6",
  outline: "#10b981",
  planning: "#6366f1",
  style: "#ec4899",
  chat: "#06b6d4",
  tool: "#f97316",
  character: "#14b8a6",
};

const FALLBACK_COLORS = ["#94a3b8", "#cbd5e1", "#e2e8f0"];

function getStepColor(stepType: string, index: number): string {
  return STEP_COLORS[stepType] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const STEP_LABELS: Record<string, string> = {
  draft: "撰写",
  repair: "修复",
  review: "审校",
  outline: "大纲",
  planning: "规划",
  style: "风格",
  chat: "对话",
  tool: "工具",
  character: "角色",
};

function stepLabel(stepType: string): string {
  return STEP_LABELS[stepType] ?? stepType;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: StepTokenUsageSummary }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-md">
      <div className="font-medium">{stepLabel(d.stepType)}</div>
      <div className="text-muted-foreground">
        {formatTokenCount(d.totalTokens)} Tokens · {d.callCount} 次调用 · {(d.percentage * 100).toFixed(1)}%
      </div>
    </div>
  );
}

export default function CreativeHubTokenStatsPanel({ novelId }: CreativeHubTokenStatsPanelProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["novelTokenStats", novelId],
    queryFn: () => fetchNovelTokenStats(novelId!),
    enabled: !!novelId,
    staleTime: 30_000,
  });

  const total = data?.data?.total;
  const byStep = data?.data?.byStep ?? [];

  return (
    <div className="rounded-2xl border border-border bg-muted p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Token 统计</span>
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => refetch()}
        >
          刷新
        </button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-muted-foreground">加载中…</div>
      ) : !novelId ? (
        <div className="py-4 text-center text-xs text-muted-foreground">绑定小说后显示 Token 统计</div>
      ) : !total || total.totalTokens === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">暂无 Token 消耗记录</div>
      ) : (
        <>
          {/* 总量卡片 */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-background p-2 text-center">
              <div className="text-[11px] text-muted-foreground">累计</div>
              <div className="text-sm font-semibold">{formatTokenCount(total.totalTokens)}</div>
            </div>
            <div className="rounded-lg bg-background p-2 text-center">
              <div className="text-[11px] text-muted-foreground">调用</div>
              <div className="text-sm font-semibold">{total.llmCallCount}</div>
            </div>
            <div className="rounded-lg bg-background p-2 text-center">
              <div className="text-[11px] text-muted-foreground">均次</div>
              <div className="text-sm font-semibold">
                {total.llmCallCount > 0 ? formatTokenCount(Math.round(total.totalTokens / total.llmCallCount)) : "-"}
              </div>
            </div>
          </div>

          {/* 步骤占比饼图 */}
          {byStep.length > 0 && (
            <>
              <div className="mb-1 text-[11px] text-muted-foreground">步骤分布（仅含已分类步骤）</div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStep}
                      dataKey="totalTokens"
                      nameKey="stepType"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={52}
                      paddingAngle={2}
                    >
                      {byStep.map((entry, index) => (
                        <Cell key={entry.stepType} fill={getStepColor(entry.stepType, index)} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 图例 */}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {byStep.map((entry, index) => (
                  <div key={entry.stepType} className="flex items-center gap-1 text-[11px]">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: getStepColor(entry.stepType, index) }}
                    />
                    <span className="text-muted-foreground">{stepLabel(entry.stepType)}</span>
                    <span className="text-foreground">{(entry.percentage * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
