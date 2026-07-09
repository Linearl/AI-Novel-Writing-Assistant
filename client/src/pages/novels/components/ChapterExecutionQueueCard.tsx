import type { Chapter } from "@ai-novel/shared/types/novel";
import { Lock, LockOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  chapterStatusDescription,
  chapterStatusLabel,
  chapterSuggestedActionLabel,
  parseRiskFlags,
  resolveChapterQueuePreview,
  resolveDisplayedChapterStatus,
  type QueueFilterKey,
  type QueueFilterOption,
} from "./chapterExecution.shared";
import WordCountIndicator from "./WordCountIndicator";

interface ChapterExecutionQueueCardProps {
  chapters: Chapter[];
  selectedChapterId: string;
  queueFilter: QueueFilterKey;
  queueFilters: QueueFilterOption[];
  streamingChapterId?: string | null;
  streamingPhase?: "streaming" | "finalizing" | "completed" | null;
  repairStreamingChapterId?: string | null;
  onQueueFilterChange: (filter: QueueFilterKey) => void;
  onSelectChapter: (chapterId: string) => void;
  onToggleLock?: (chapterId: string, locked: boolean) => void;
  togglingLockChapterId?: string | null;
}

export default function ChapterExecutionQueueCard(props: ChapterExecutionQueueCardProps) {
  const {
    chapters,
    selectedChapterId,
    queueFilter,
    queueFilters,
    streamingChapterId,
    streamingPhase,
    repairStreamingChapterId,
    onQueueFilterChange,
    onSelectChapter,
    onToggleLock,
    togglingLockChapterId,
  } = props;

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/70 lg:sticky lg:top-4">
      <CardHeader className="gap-3 border-b bg-gradient-to-b from-muted/30 to-background pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">章节队列</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            左侧只负责切章和查看推进状态，把正文阅读区完整留给中间的主写作面板。
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>当前可见 {chapters.length} 章</span>
          <span>筛选：{queueFilters.find((item) => item.key === queueFilter)?.label ?? "全部"}</span>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            {queueFilters.map((filter) => (
              <Button
                key={filter.key}
                size="sm"
                variant={queueFilter === filter.key ? "default" : "outline"}
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => onQueueFilterChange(filter.key)}
              >
                {filter.label} {filter.count}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {chapters.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-xs leading-6 text-muted-foreground">
              当前筛选下还没有章节。
            </div>
          ) : (
            chapters.map((chapter) => {
              const chapterRisks = parseRiskFlags(chapter.riskFlags);
              const isSelected = selectedChapterId === chapter.id;
              const isStreamingTarget = streamingChapterId === chapter.id;
              const isRepairTarget = repairStreamingChapterId === chapter.id;
              const displayedStatus = resolveDisplayedChapterStatus(chapter);
              const isLocked = chapter.locked;
              const isTogglingLock = togglingLockChapterId === chapter.id;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => onSelectChapter(chapter.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/35"
                  } ${isLocked ? "opacity-75" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className={`text-sm font-semibold leading-6 ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                        第{chapter.order}章 {chapter.title || "未命名章节"}
                      </div>
                      <div className="line-clamp-2 text-xs leading-6 text-muted-foreground">
                        {resolveChapterQueuePreview(chapter)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {onToggleLock ? (
                        <button
                          type="button"
                          disabled={isTogglingLock}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(chapter.id, !isLocked);
                          }}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                            isLocked
                              ? "bg-amber-100 text-warning hover:bg-amber-200"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          } disabled:opacity-50`}
                          title={isLocked ? "点击解锁此章节" : "点击锁定此章节（防止 AI 自动修改）"}
                          aria-label={isLocked ? "解锁此章节" : "锁定此章节"}
                        >
                          {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                        </button>
                      ) : null}
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="min-w-[60px] justify-center rounded-full px-2 py-1 text-[11px]"
                        title={chapterStatusDescription(displayedStatus)}
                        aria-label={chapterStatusDescription(displayedStatus)}
                      >
                        {chapterStatusLabel(displayedStatus)}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {isLocked ? (
                      <StatusBadge variant="warning" className="py-1">
                        已锁定
                      </StatusBadge>
                    ) : null}
                    {isStreamingTarget ? (
                      <Badge className="rounded-full px-2 py-1 text-[11px]">
                        {streamingPhase === "finalizing" ? "收尾中" : "写作中"}
                      </Badge>
                    ) : null}
                    {isRepairTarget ? (
                      <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px]">
                        修复中
                      </Badge>
                    ) : null}
                    {chapterRisks.slice(0, 2).map((risk) => (
                      <Badge key={`${chapter.id}-${risk}`} variant="secondary" className="rounded-full px-2 py-1 text-[11px]">
                        {risk}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/25 p-3 text-[11px] text-muted-foreground">
                    <div>
                      <div>下一步</div>
                      <div className="mt-1 font-medium text-foreground">{chapterSuggestedActionLabel(chapter)}</div>
                    </div>
                    <div>
                      <div>当前字数</div>
                      <div className="mt-1 font-medium text-foreground">{chapter.content?.length ?? 0}</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <WordCountIndicator
                      actualWordCount={chapter.content?.length ?? 0}
                      wordCountTarget={chapter.wordCountTarget}
                      waterContentAnalysis={chapter.waterContentAnalysis}
                      variant="queue"
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
