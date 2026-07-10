import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CollapsibleSummary from "./CollapsibleSummary";
import WorldInjectionHint from "./WorldInjectionHint";
import type { OutlineTabViewProps } from "./NovelEditView.types";

export const readinessSteps = [
  {
    key: "canGenerateStrategy",
    label: "卷战略",
    description: "先拿到推荐卷数、硬/软规划和升级梯度。",
  },
  {
    key: "canGenerateSkeleton",
    label: "卷骨架",
    description: "确认每卷的开卷抓手、压迫源和兑现方式。",
  },
] as const;

export function getNextOutlineAction(readiness: OutlineTabViewProps["readiness"]): string {
  if (!readiness.canGenerateStrategy) return "先生成卷战略建议";
  if (!readiness.canGenerateSkeleton) return "现在适合生成全书卷骨架";
  return "卷战略阶段已齐备，可以继续进入节奏 / 拆章";
}

type ReadinessProps = Pick<
  OutlineTabViewProps,
  | "worldInjectionSummary"
  | "hasCharacters"
  | "hasUnsavedVolumeDraft"
  | "generationNotice"
  | "readiness"
  | "volumeCountGuidance"
  | "customVolumeCountEnabled"
  | "customVolumeCountInput"
  | "onCustomVolumeCountEnabledChange"
  | "onCustomVolumeCountInputChange"
  | "onApplyCustomVolumeCount"
  | "onRestoreSystemRecommendedVolumeCount"
  | "strategyPlan"
  | "critiqueReport"
  | "isGeneratingStrategy"
  | "onGenerateStrategy"
  | "isCritiquingStrategy"
  | "onCritiqueStrategy"
  | "isGeneratingSkeleton"
  | "onGenerateSkeleton"
  | "onGoToCharacterTab"
  | "volumes"
  | "onSave"
  | "isSaving"
  | "volumeMessage"
>;

export default function OutlineStrategyReadiness(props: ReadinessProps) {
  const {
    worldInjectionSummary,
    hasCharacters,
    hasUnsavedVolumeDraft,
    generationNotice,
    readiness,
    volumeCountGuidance,
    customVolumeCountEnabled,
    customVolumeCountInput,
    onCustomVolumeCountEnabledChange,
    onCustomVolumeCountInputChange,
    onApplyCustomVolumeCount,
    onRestoreSystemRecommendedVolumeCount,
    strategyPlan,
    critiqueReport,
    isGeneratingStrategy,
    onGenerateStrategy,
    isCritiquingStrategy,
    onCritiqueStrategy,
    isGeneratingSkeleton,
    onGenerateSkeleton,
    onGoToCharacterTab,
    volumes,
    onSave,
    isSaving,
    volumeMessage,
  } = props;

  const completedReadinessCount = readinessSteps.filter((item) => readiness[item.key]).length;
  const readinessProgress = Math.round((completedReadinessCount / Math.max(readinessSteps.length, 1)) * 100);
  const nextOutlineAction = getNextOutlineAction(readiness);
  const outlineStageReady = completedReadinessCount === readinessSteps.length;
  const volumeCountModeLabel = volumeCountGuidance.userPreferredVolumeCount != null
    ? `当前固定 ${volumeCountGuidance.userPreferredVolumeCount} 卷`
    : volumeCountGuidance.respectedExistingVolumeCount != null
      ? `当前沿用草稿 ${volumeCountGuidance.respectedExistingVolumeCount} 卷`
      : `当前按系统建议 ${volumeCountGuidance.systemRecommendedVolumeCount} 卷`;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>卷战略 / 卷骨架</CardTitle>
            <div className="text-sm text-muted-foreground">先让系统帮你决定卷数和硬/软规划，再确认可继续拆节奏板的卷骨架。</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AiButton variant="outline" onClick={onGenerateStrategy} disabled={isGeneratingStrategy}>
              {isGeneratingStrategy ? "生成中..." : "生成卷战略建议"}
            </AiButton>
            <AiButton variant="outline" onClick={onCritiqueStrategy} disabled={isCritiquingStrategy || !strategyPlan}>
              {isCritiquingStrategy ? "审查中..." : "AI审查卷战略"}
            </AiButton>
            <AiButton onClick={onGenerateSkeleton} disabled={isGeneratingSkeleton || !strategyPlan}>
              {isGeneratingSkeleton ? "生成中..." : volumes.length > 0 ? "重生成全书卷骨架" : "生成全书卷骨架"}
            </AiButton>
            <Button variant="secondary" onClick={onSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存卷工作区"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />
          {!hasCharacters ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <span>建议先补齐角色，再生成卷战略和卷骨架。</span>
              <Button size="sm" variant="outline" onClick={onGoToCharacterTab}>去角色管理</Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            <span>{generationNotice}</span>
            {hasUnsavedVolumeDraft ? <Badge variant="secondary">含未保存草稿</Badge> : null}
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <Card className="self-start">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">阶段就绪度</CardTitle>
                    <Badge variant={outlineStageReady ? "default" : "outline"}>
                      {completedReadinessCount}/{readinessSteps.length} 已就绪
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">推荐下一步</div>
                    <div className="mt-1 font-medium text-foreground">{nextOutlineAction}</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${readinessProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {outlineStageReady
                        ? "当前卷战略阶段已经具备完整推进条件。"
                        : readiness.blockingReasons.length > 0
                          ? `还有 ${readiness.blockingReasons.length} 项阻塞条件需要处理。`
                          : "当前可以继续推进本阶段。"}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {readinessSteps.map((item) => (
                      <div key={item.key} className="rounded-xl border border-border/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-foreground">{item.label}</div>
                          <Badge variant={readiness[item.key] ? "default" : "outline"}>
                            {readiness[item.key] ? "已就绪" : "未就绪"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</div>
                      </div>
                    ))}
                  </div>

                  {readiness.blockingReasons.filter((r) => !r.includes("节奏板") && !r.includes("拆章节")).length > 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      {readiness.blockingReasons.filter((r) => !r.includes("节奏板") && !r.includes("拆章节")).map((reason) => <div key={reason}>{reason}</div>)}
                    </div>
                  ) : (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      当前工作区已经具备继续推进的基础条件。
                    </div>
                  )}
                  {volumeMessage ? <div className="text-xs text-muted-foreground">{volumeMessage}</div> : null}
                </CardContent>
              </Card>

              <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
                <summary className="cursor-pointer list-none">
                  <CollapsibleSummary
                    title="卷数建议与策略审查"
                    description="这些属于辅助决策信息。首屏先看推荐下一步和当前卷，确实需要时再展开审查与卷数控制。"
                    meta={<Badge variant="outline">{volumeCountModeLabel}</Badge>}
                  />
                </summary>

                <div className="mt-4 space-y-3">
                  <Card className="self-start">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">卷数建议</CardTitle>
                        <Badge variant="outline">{volumeCountModeLabel}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">总章节预算</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{volumeCountGuidance.chapterBudget} 章</div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">推荐卷数区间</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">
                            {volumeCountGuidance.allowedVolumeCountRange.min}-{volumeCountGuidance.allowedVolumeCountRange.max} 卷
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">系统建议卷数</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">{volumeCountGuidance.systemRecommendedVolumeCount} 卷</div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">默认硬规划范围</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">
                            {volumeCountGuidance.hardPlannedVolumeRange.min}-{volumeCountGuidance.hardPlannedVolumeRange.max} 卷
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
                        标准卷尺度按 {volumeCountGuidance.targetChapterRange.min}-{volumeCountGuidance.targetChapterRange.max} 章 / 卷设计，
                        理想值约 {volumeCountGuidance.targetChapterRange.ideal} 章 / 卷。超长篇默认通过增加卷数来保持每卷的阶段感、升级节点和卷级回报，不再压成少数巨卷。
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={customVolumeCountEnabled ? "default" : "outline"}
                          onClick={() => onCustomVolumeCountEnabledChange(!customVolumeCountEnabled)}
                        >
                          {customVolumeCountEnabled ? "收起自定义卷数" : "自定义卷数"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={onRestoreSystemRecommendedVolumeCount}>
                          恢复系统建议
                        </Button>
                      </div>

                      {customVolumeCountEnabled ? (
                        <div className="rounded-xl border border-border/70 p-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_auto_auto] sm:items-end">
                            <label className="space-y-1 text-sm">
                              <span className="text-xs text-muted-foreground">固定卷数</span>
                              <input
                                type="number"
                                min={volumeCountGuidance.allowedVolumeCountRange.min}
                                max={volumeCountGuidance.allowedVolumeCountRange.max}
                                className="w-full rounded-md border bg-background p-2"
                                value={customVolumeCountInput}
                                onChange={(event) => onCustomVolumeCountInputChange(event.target.value)}
                              />
                            </label>
                            <Button size="sm" onClick={onApplyCustomVolumeCount}>应用固定卷数</Button>
                            <div className="text-xs text-muted-foreground">
                              允许范围：{volumeCountGuidance.allowedVolumeCountRange.min}-{volumeCountGuidance.allowedVolumeCountRange.max} 卷
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  {critiqueReport ? (
                    <Card className="self-start">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">卷战略审稿</CardTitle>
                          <Badge variant={critiqueReport.overallRisk === "high" ? "secondary" : critiqueReport.overallRisk === "medium" ? "outline" : "default"}>
                            风险 {critiqueReport.overallRisk}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="rounded-md border p-3 text-xs text-muted-foreground">{critiqueReport.summary}</div>
                        {critiqueReport.issues.length > 0 ? (
                          <div className="space-y-2">
                            {critiqueReport.issues.map((issue) => (
                              <div key={`${issue.targetRef}-${issue.title}`} className="rounded-md border p-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{issue.targetRef}</Badge>
                                  <Badge variant={issue.severity === "high" ? "secondary" : issue.severity === "medium" ? "outline" : "default"}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <div className="mt-2 font-medium">{issue.title}</div>
                                <div className="mt-1 text-muted-foreground">{issue.detail}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
