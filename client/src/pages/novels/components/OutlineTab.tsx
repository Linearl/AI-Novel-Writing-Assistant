import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookPayoffLedgerCard from "./BookPayoffLedgerCard";
import VolumePayoffOverviewCard from "./VolumePayoffOverviewCard";
import type { OutlineTabViewProps } from "./NovelEditView.types";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import VolumeResourceCommitmentCard from "./OutlineVolumeResources";
import OutlineStrategyReadiness from "./OutlineStrategyReadiness";
import OutlineVersionControl from "./OutlineVersionControl";

export default function OutlineTab(props: OutlineTabViewProps) {
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
    isGeneratingStrategy,
    onGenerateStrategy,
    isCritiquingStrategy,
    onCritiqueStrategy,
    isGeneratingSkeleton,
    onGenerateSkeleton,
    onGoToCharacterTab,
    latestStateSnapshot,
    payoffLedger,
    characterResources = [],
    draftText,
    volumes,
    onVolumeFieldChange,
    onVolumeTargetChapterCountChange,
    onOpenPayoffsChange,
    onAddVolume,
    onRemoveVolume,
    onMoveVolume,
    onSave,
    isSaving,
    volumeMessage,
    volumeVersions,
    selectedVersionId,
    onSelectedVersionChange,
    onCreateDraftVersion,
    isCreatingDraftVersion,
    onLoadSelectedVersionToDraft,
    onActivateVersion,
    isActivatingVersion,
    onFreezeVersion,
    isFreezingVersion,
    onLoadVersionDiff,
    isLoadingVersionDiff,
    diffResult,
    onAnalyzeDraftImpact,
    isAnalyzingDraftImpact,
    onAnalyzeVersionImpact,
    isAnalyzingVersionImpact,
    impactResult,
  } = props;

  const [selectedVolumeId, setSelectedVolumeId] = useState(volumes[0]?.id ?? "");

  useEffect(() => {
    if (!volumes.some((volume) => volume.id === selectedVolumeId)) {
      setSelectedVolumeId(volumes[0]?.id ?? "");
    }
  }, [selectedVolumeId, volumes]);

  const selectedVolume = volumes.find((volume) => volume.id === selectedVolumeId) ?? volumes[0];
  const selectedStrategyVolume = selectedVolume
    ? strategyPlan?.volumes.find((item) => item.sortOrder === selectedVolume.sortOrder) ?? null
    : null;

  return (
    <div className="space-y-4">
      <DirectorTakeoverEntryPanel
        title="从卷战略接管"
        description="AI 会先判断卷战略和卷骨架是否已齐，再决定继续补缺失部分还是重跑当前步骤。"
        entry={props.directorTakeoverEntry}
      />

      <OutlineStrategyReadiness
        worldInjectionSummary={worldInjectionSummary}
        hasCharacters={hasCharacters}
        hasUnsavedVolumeDraft={hasUnsavedVolumeDraft}
        generationNotice={generationNotice}
        readiness={readiness}
        volumeCountGuidance={volumeCountGuidance}
        customVolumeCountEnabled={customVolumeCountEnabled}
        customVolumeCountInput={customVolumeCountInput}
        onCustomVolumeCountEnabledChange={onCustomVolumeCountEnabledChange}
        onCustomVolumeCountInputChange={onCustomVolumeCountInputChange}
        onApplyCustomVolumeCount={onApplyCustomVolumeCount}
        onRestoreSystemRecommendedVolumeCount={onRestoreSystemRecommendedVolumeCount}
        strategyPlan={strategyPlan}
        critiqueReport={props.critiqueReport}
        isGeneratingStrategy={isGeneratingStrategy}
        onGenerateStrategy={onGenerateStrategy}
        isCritiquingStrategy={isCritiquingStrategy}
        onCritiqueStrategy={onCritiqueStrategy}
        isGeneratingSkeleton={isGeneratingSkeleton}
        onGenerateSkeleton={onGenerateSkeleton}
        onGoToCharacterTab={onGoToCharacterTab}
        volumes={volumes}
        onSave={onSave}
        isSaving={isSaving}
        volumeMessage={volumeMessage}
      />

      <div className="grid items-start gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <OutlineVersionControl
            draftText={draftText}
            volumeVersions={volumeVersions}
            selectedVersionId={selectedVersionId}
            onSelectedVersionChange={onSelectedVersionChange}
            onCreateDraftVersion={onCreateDraftVersion}
            isCreatingDraftVersion={isCreatingDraftVersion}
            onLoadSelectedVersionToDraft={onLoadSelectedVersionToDraft}
            onActivateVersion={onActivateVersion}
            isActivatingVersion={isActivatingVersion}
            onFreezeVersion={onFreezeVersion}
            isFreezingVersion={isFreezingVersion}
            onLoadVersionDiff={onLoadVersionDiff}
            isLoadingVersionDiff={isLoadingVersionDiff}
            diffResult={diffResult}
            onAnalyzeDraftImpact={onAnalyzeDraftImpact}
            isAnalyzingDraftImpact={isAnalyzingDraftImpact}
            onAnalyzeVersionImpact={onAnalyzeVersionImpact}
            isAnalyzingVersionImpact={isAnalyzingVersionImpact}
            impactResult={impactResult}
            volumes={volumes}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">卷战略摘要</CardTitle>
              <div className="text-sm text-muted-foreground">先看整本书的卷级回报和升级路线，再在下面选择某一卷进入详细编辑。</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {strategyPlan ? (
                <>
                  <Badge variant="outline">推荐 {strategyPlan.recommendedVolumeCount} 卷</Badge>
                  <Badge variant="secondary">硬规划 {strategyPlan.hardPlannedVolumeCount} 卷</Badge>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {strategyPlan ? (
            <>
              <div className="grid gap-3 xl:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">读者回报梯度</div>
                  <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.readerRewardLadder}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">升级梯度</div>
                  <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.escalationLadder}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">中盘转向</div>
                  <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.midpointShift}</div>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
                <div className="text-xs">卷级节奏总览</div>
                <div className="mt-2 leading-6">
                  {strategyPlan.volumes
                    .map((volume) => `第${volume.sortOrder}卷：${volume.roleLabel}，${volume.coreReward}`)
                    .join("；")}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
              当前还没有卷战略建议。先点击"生成卷战略建议"。
            </div>
          )}
        </CardContent>
      </Card>

      <BookPayoffLedgerCard
        latestStateSnapshot={latestStateSnapshot}
        payoffLedger={payoffLedger}
      />

      <VolumeResourceCommitmentCard
        selectedVolume={selectedVolume}
        resources={characterResources}
      />

      <div className="grid items-start gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="self-start xl:sticky xl:top-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">卷导航</CardTitle>
                <div className="text-sm text-muted-foreground">左侧用卷标题和卷描述定位当前要编辑的卷。</div>
              </div>
              <Button size="sm" variant="outline" onClick={onAddVolume}>新增卷</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {volumes.length > 0 ? (
              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {volumes.map((volume) => {
                  const strategyVolume = strategyPlan?.volumes.find((item) => item.sortOrder === volume.sortOrder) ?? null;
                  const isSelected = selectedVolume?.id === volume.id;
                  return (
                    <button
                      key={volume.id}
                      type="button"
                      onClick={() => setSelectedVolumeId(volume.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-sky-400/70 bg-sky-50 shadow-sm ring-1 ring-sky-200"
                          : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={isSelected ? "default" : "outline"}>第{volume.sortOrder}卷</Badge>
                        {strategyVolume ? (
                          <Badge variant={strategyVolume.planningMode === "hard" ? "secondary" : "outline"}>
                            {strategyVolume.planningMode === "hard" ? "硬规划" : "软规划"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        {volume.title || strategyVolume?.roleLabel || `第${volume.sortOrder}卷`}
                      </div>
                      <div className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {volume.summary || volume.mainPromise || strategyVolume?.coreReward || "先补这卷的标题和描述，便于后续导航。"}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                当前还没有卷骨架。先生成卷战略建议，再点击"生成全书卷骨架"。
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {selectedVolume ? (
            <>
              <VolumePayoffOverviewCard
                selectedVolume={selectedVolume}
              />
              <Card key={selectedVolume.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">第{selectedVolume.sortOrder}卷</Badge>
                      {selectedStrategyVolume ? (
                        <Badge variant={selectedStrategyVolume.planningMode === "hard" ? "secondary" : "outline"}>
                          {selectedStrategyVolume.planningMode === "hard" ? "硬规划" : "软规划"}
                        </Badge>
                      ) : null}
                      {selectedStrategyVolume?.roleLabel ? <span className="text-sm text-muted-foreground">{selectedStrategyVolume.roleLabel}</span> : null}
                      <span className="text-sm text-muted-foreground">
                        {selectedVolume.chapters.length > 0
                          ? `章节 ${selectedVolume.chapters[0]?.chapterOrder}-${selectedVolume.chapters[selectedVolume.chapters.length - 1]?.chapterOrder}`
                          : "未拆章"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onMoveVolume(selectedVolume.id, -1)} disabled={selectedVolume.sortOrder === 1}>上移</Button>
                      <Button size="sm" variant="outline" onClick={() => onMoveVolume(selectedVolume.id, 1)} disabled={selectedVolume.sortOrder === volumes.length}>下移</Button>
                      <Button size="sm" variant="outline" onClick={() => onRemoveVolume(selectedVolume.id)} disabled={volumes.length <= 1}>删除</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-xs text-muted-foreground">卷标题</span>
                    <input className="w-full rounded-md border bg-background p-2" value={selectedVolume.title} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "title", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">卷摘要</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.summary ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "summary", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">开卷抓手</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.openingHook ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "openingHook", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">主承诺</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.mainPromise ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "mainPromise", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">主压迫源</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.primaryPressureSource ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "primaryPressureSource", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">核心卖点</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.coreSellingPoint ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "coreSellingPoint", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">升级方式</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.escalationMode ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "escalationMode", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">主角变化</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.protagonistChange ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "protagonistChange", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">中段风险</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.midVolumeRisk ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "midVolumeRisk", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">卷末高潮</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.climax ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "climax", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">兑现类型</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.payoffType ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "payoffType", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">下卷钩子</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.nextVolumeHook ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "nextVolumeHook", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">卷间重置点</span>
                    <Textarea className="min-h-[84px] p-2" value={selectedVolume.resetPoint ?? ""} onChange={(event) => onVolumeFieldChange(selectedVolume.id, "resetPoint", event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-1">
                    <span className="text-xs text-muted-foreground">目标章节数（留空=自动分配）</span>
                    <input
                      type="number"
                      min={3}
                      max={50}
                      className="w-full rounded-md border bg-background p-2"
                      value={selectedVolume.targetChapterCount ?? ""}
                      placeholder="自动"
                      onChange={(event) => {
                        const v = event.target.value.trim();
                        const parsed = v === "" ? null : Number(v);
                        if (onVolumeTargetChapterCountChange) {
                          onVolumeTargetChapterCountChange(selectedVolume.id, parsed);
                        }
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-xs text-muted-foreground">本卷未兑现事项</span>
                    <Textarea className="min-h-[84px] p-2" placeholder="每行一个，或用中文逗号分隔。" value={selectedVolume.openPayoffs.join("\n")} onChange={(event) => onOpenPayoffsChange(selectedVolume.id, event.target.value)} />
                  </label>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              左侧先选择一卷，或先生成全书卷骨架，再在这里编辑当前卷详情。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
