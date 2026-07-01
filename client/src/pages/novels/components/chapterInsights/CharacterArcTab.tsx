import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getNovelCharacters, getCharacterArc, getCharacterRelationEvolution } from "@/api/novel/characters";
import { queryKeys } from "@/api/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Character } from "@ai-novel/shared/types/novel";

interface CharacterArcTabProps {
  novelId: string;
}

interface ChartPoint {
  chapter: number;
  label: string;
  valence: number | null;
}

function buildChartData(
  timeline: Array<{ chapterOrder: number | null; title: string; event: string }>,
): ChartPoint[] {
  return timeline
    .filter((t) => typeof t.chapterOrder === "number")
    .map((t) => ({
      chapter: t.chapterOrder!,
      label: `Ch.${t.chapterOrder}`,
      valence: null,
    }));
}

function CharacterSelector(props: {
  characters: Character[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <select
      value={props.selectedId}
      onChange={(e) => props.onSelect(e.target.value)}
      className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {props.characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.role})
        </option>
      ))}
    </select>
  );
}

function ArcChart(props: { data: ChartPoint[] }) {
  if (props.data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">暂无时间线数据</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={props.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis domain={[-5, 5]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(value, name) => [String(value), name === "valence" ? "情感值" : String(name)]}
          labelFormatter={(label) => `章节: ${String(label)}`}
        />
        <Line
          type="monotone"
          dataKey="valence"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TimelineEventList(props: {
  events: Array<{ chapterOrder: number | null; title: string; event: string }>;
}) {
  if (props.events.length === 0) {
    return <div className="py-4 text-center text-xs text-muted-foreground">暂无事件</div>;
  }
  return (
    <div className="space-y-2">
      {props.events.map((evt, idx) => (
        <div
          key={`${evt.chapterOrder}-${idx}`}
          className="rounded-lg border border-border/60 bg-background p-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            {typeof evt.chapterOrder === "number" && (
              <Badge variant="outline" className="text-[11px]">第{evt.chapterOrder}章</Badge>
            )}
            <span className="text-sm font-medium text-foreground">{evt.title}</span>
          </div>
          {evt.event && (
            <div className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{evt.event}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function RelationTimeline(props: {
  relations: Array<{
    partnerName: string;
    stages: Array<{
      stageLabel: string;
      stageSummary: string;
      chapterOrder: number | null;
      trustScore: number | null;
      conflictScore: number | null;
      intimacyScore: number | null;
      isCurrent: boolean;
    }>;
  }>;
}) {
  if (props.relations.length === 0) {
    return <div className="py-4 text-center text-xs text-muted-foreground">暂无关系数据</div>;
  }
  return (
    <div className="space-y-3">
      {props.relations.map((rel) => (
        <div key={rel.partnerName} className="rounded-lg border border-border/60 bg-background p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{rel.partnerName}</span>
            <Badge variant="outline" className="text-[11px]">{rel.stages.length} 个阶段</Badge>
          </div>
          <div className="mt-2 space-y-1.5">
            {rel.stages.map((stage, idx) => (
              <div key={idx} className="flex flex-wrap items-start gap-2 text-xs">
                {typeof stage.chapterOrder === "number" && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">Ch.{stage.chapterOrder}</Badge>
                )}
                <span className="font-medium text-foreground">{stage.stageLabel}</span>
                {stage.isCurrent && <Badge variant="default" className="text-[10px]">当前</Badge>}
                <span className="text-muted-foreground">{stage.stageSummary}</span>
              </div>
            ))}
          </div>
          {rel.stages.some((s) => s.trustScore != null) && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {rel.stages.filter((s) => s.trustScore != null).slice(-1).map((s, idx) => (
                <span key={idx}>信任={s.trustScore} 冲突={s.conflictScore} 亲密={s.intimacyScore}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArcCard(props: { arcData: { arcStart: string | null; arcMidpoint: string | null; arcClimax: string | null; arcEnd: string | null }; currentState: string | null; currentGoal: string | null }) {
  const { arcData, currentState, currentGoal } = props;
  const hasArc = arcData.arcStart || arcData.arcMidpoint || arcData.arcClimax || arcData.arcEnd;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">弧光规划</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        {arcData.arcStart && <div><span className="text-muted-foreground">起始：</span>{arcData.arcStart}</div>}
        {arcData.arcMidpoint && <div><span className="text-muted-foreground">中点：</span>{arcData.arcMidpoint}</div>}
        {arcData.arcClimax && <div><span className="text-muted-foreground">高潮：</span>{arcData.arcClimax}</div>}
        {arcData.arcEnd && <div><span className="text-muted-foreground">终局：</span>{arcData.arcEnd}</div>}
        {!hasArc && <div className="text-muted-foreground">暂无弧光规划</div>}
        {currentState && <div className="mt-1"><Badge variant="secondary" className="text-[11px]">当前状态</Badge>{" "}{currentState}</div>}
        {currentGoal && <div><Badge variant="outline" className="text-[11px]">当前目标</Badge>{" "}{currentGoal}</div>}
      </CardContent>
    </Card>
  );
}

export default function CharacterArcTab(props: CharacterArcTabProps) {
  const { novelId } = props;
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  const charactersQuery = useQuery({
    queryKey: queryKeys.novels.characters(novelId),
    queryFn: async () => (await getNovelCharacters(novelId)).data ?? [],
    enabled: !!novelId,
  });

  const characters = charactersQuery.data ?? [];
  const effectiveCharId = selectedCharId ?? characters[0]?.id ?? null;

  const arcQuery = useQuery({
    queryKey: queryKeys.novels.characterArc(novelId, effectiveCharId ?? ""),
    queryFn: async () => (await getCharacterArc(novelId, effectiveCharId!)).data,
    enabled: !!novelId && !!effectiveCharId,
  });

  const relationQuery = useQuery({
    queryKey: queryKeys.novels.characterRelationEvolution(novelId, effectiveCharId ?? ""),
    queryFn: async () => (await getCharacterRelationEvolution(novelId, effectiveCharId!)).data,
    enabled: !!novelId && !!effectiveCharId,
  });

  const chartData = useMemo(
    () => (arcQuery.data ? buildChartData(arcQuery.data.timeline) : []),
    [arcQuery.data],
  );

  if (charactersQuery.isLoading) {
    return <div className="py-6 text-center text-xs text-muted-foreground">加载角色列表...</div>;
  }
  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        当前小说暂无角色数据。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-background p-3">
        <div className="text-xs font-medium text-muted-foreground">角色弧线</div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">选择角色查看弧光规划、时间线事件和关系演化。</div>
      </div>

      <CharacterSelector characters={characters} selectedId={effectiveCharId ?? ""} onSelect={setSelectedCharId} />

      {arcQuery.isLoading && <div className="py-6 text-center text-xs text-muted-foreground">加载弧线数据...</div>}

      {arcQuery.data && (
        <>
          <ArcCard arcData={arcQuery.data.arc} currentState={arcQuery.data.currentState} currentGoal={arcQuery.data.currentGoal} />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">时间线事件</CardTitle></CardHeader>
            <CardContent>
              <ArcChart data={chartData} />
              <div className="mt-3"><TimelineEventList events={arcQuery.data.timeline} /></div>
            </CardContent>
          </Card>
        </>
      )}

      {relationQuery.data && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">关系演化</CardTitle></CardHeader>
          <CardContent><RelationTimeline relations={relationQuery.data.relations} /></CardContent>
        </Card>
      )}
    </div>
  );
}
