import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PaceCurveData, PaceCurveVolume } from "@ai-novel/shared";
import { getPaceCurveData } from "@/api/novel/paceCurve";
import { queryKeys } from "@/api/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaceAdjustModal from "./PaceAdjustModal";

interface PaceCurveChartProps {
  novelId: string;
}

interface ChartDataPoint {
  chapterOrder: number;
  label: string;
  title: string;
  conflictLevel: number | null;
  revealLevel: number | null;
  isWritten: boolean;
  chapterId: string | null;
  volumeId: string;
  volumeTitle: string;
  volumeSortOrder: number;
}

function flattenChartData(data: PaceCurveData): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  for (const volume of data.volumes) {
    for (const chapter of volume.chapters) {
      points.push({
        chapterOrder: chapter.chapterOrder,
        label: `Ch.${chapter.chapterOrder}`,
        title: chapter.title,
        conflictLevel: chapter.conflictLevel,
        revealLevel: chapter.revealLevel,
        isWritten: chapter.isWritten,
        chapterId: chapter.chapterId,
        volumeId: chapter.volumeId,
        volumeTitle: volume.volumeTitle,
        volumeSortOrder: volume.sortOrder,
      });
    }
  }
  return points;
}

function findVolumeBoundaries(volumes: PaceCurveVolume[]): number[] {
  const boundaries: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < volumes.length; i++) {
    cumulative += volumes[i].chapters.length;
    if (i < volumes.length - 1) {
      boundaries.push(cumulative);
    }
  }
  return boundaries;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  onClickChapter?: (chapter: ChartDataPoint) => void;
}

function renderCustomDot(onClickChapter: ((chapter: ChartDataPoint) => void) | undefined) {
  return (props: CustomDotProps) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    if (!payload.isWritten) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="transparent"
          stroke="#f59e0b"
          strokeWidth={2}
          className="cursor-pointer"
          onClick={() => onClickChapter?.(payload)}
        />
      );
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#6366f1"
        stroke="#6366f1"
        strokeWidth={1}
      />
    );
  };
}

export default function PaceCurveChart({ novelId }: PaceCurveChartProps) {
  const queryClient = useQueryClient();
  const [adjustTarget, setAdjustTarget] = useState<ChartDataPoint | null>(null);

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: queryKeys.novels.paceCurve(novelId),
    queryFn: () => getPaceCurveData(novelId),
    enabled: !!novelId,
  });

  const paceData = apiResponse?.data;

  const chartData = useMemo(
    () => (paceData ? flattenChartData(paceData) : []),
    [paceData],
  );

  const volumeBoundaries = useMemo(
    () => (paceData ? findVolumeBoundaries(paceData.volumes) : []),
    [paceData],
  );

  const volumeLabels = useMemo(
    () =>
      paceData
        ? paceData.volumes.map((v) => ({
            offset: v.chapters.length > 0 ? v.chapters[0].chapterOrder - 1 : 0,
            title: v.volumeTitle,
          }))
        : [],
    [paceData],
  );

  const handleClickChapter = (point: ChartDataPoint) => {
    if (!point.isWritten) {
      setAdjustTarget(point);
    }
  };

  const handleAdjustSave = () => {
    setAdjustTarget(null);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.novels.paceCurve(novelId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.novels.volumeWorkspace(novelId),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          加载节奏曲线中...
        </CardContent>
      </Card>
    );
  }

  if (!paceData || chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          暂无节奏数据。请先完成卷规划（包含章节列表）。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">全书节奏曲线</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              空心点 = 未写章节（可点击调整）
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              实心点 = 已写章节
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as ChartDataPoint | undefined;
                if (!point) return null;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs shadow-md">
                    <div className="font-medium">
                      Ch.{point.chapterOrder} - {point.volumeTitle}
                    </div>
                    <div className="text-muted-foreground">{point.isWritten ? "已写" : "未写"}</div>
                    <div className="mt-1">
                      <span className="text-rose-500">冲突: {point.conflictLevel ?? "-"}</span>
                      <span className="ml-2 text-blue-500">揭示: {point.revealLevel ?? "-"}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            {volumeBoundaries.map((boundary, i) => (
              <ReferenceLine
                key={`vol-boundary-${i}`}
                x={boundary}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: volumeLabels[i + 1]?.title ?? "",
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="conflictLevel"
              name="冲突等级"
              stroke="#ef4444"
              strokeWidth={2}
              dot={renderCustomDot(handleClickChapter) as any}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="revealLevel"
              name="揭示等级"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={renderCustomDot(handleClickChapter) as any}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>

        {paceData.volumes.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {paceData.volumes.map((volume) => (
              <Badge key={volume.volumeId} variant="outline" className="text-xs">
                {volume.volumeTitle}: {volume.chapters.length} 章
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      {adjustTarget && (
        <PaceAdjustModal
          novelId={novelId}
          chapter={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={handleAdjustSave}
        />
      )}
    </Card>
  );
}
