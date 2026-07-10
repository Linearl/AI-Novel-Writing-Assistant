import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VolumeImpactResult, VolumePlanDiff, VolumePlanVersionSummary } from "@ai-novel/shared";
import CollapsibleSummary from "./CollapsibleSummary";

function versionStatusLabel(status: "draft" | "active" | "frozen"): string {
  if (status === "active") return "已生效";
  if (status === "frozen") return "已冻结";
  return "草稿";
}

function versionStatusVariant(status: "draft" | "active" | "frozen"): "secondary" | "outline" | "default" {
  if (status === "active") return "default";
  if (status === "frozen") return "outline";
  return "secondary";
}

interface OutlineVersionControlProps {
  draftText: string;
  volumeVersions: VolumePlanVersionSummary[];
  selectedVersionId: string;
  onSelectedVersionChange: (id: string) => void;
  onCreateDraftVersion: () => void;
  isCreatingDraftVersion: boolean;
  onLoadSelectedVersionToDraft: () => void;
  onActivateVersion: () => void;
  isActivatingVersion: boolean;
  onFreezeVersion: () => void;
  isFreezingVersion: boolean;
  onLoadVersionDiff: () => void;
  isLoadingVersionDiff: boolean;
  diffResult: VolumePlanDiff | null;
  onAnalyzeDraftImpact: () => void;
  isAnalyzingDraftImpact: boolean;
  onAnalyzeVersionImpact: () => void;
  isAnalyzingVersionImpact: boolean;
  impactResult: VolumeImpactResult | null;
  volumes: Array<{ id: string }>;
}

export default function OutlineVersionControl(props: OutlineVersionControlProps) {
  const {
    draftText,
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
    volumes,
  } = props;

  const selectedVersion = volumeVersions.find((item) => item.id === selectedVersionId);

  return (
    <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
      <summary className="cursor-pointer list-none">
        <CollapsibleSummary
          title="派生文本、版本控制与影响分析"
          description="这部分偏向收尾和对比，不是当前卷骨架编辑时必须一直盯着看的内容。"
        />
      </summary>

      <div className="mt-4 space-y-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">派生文本预览</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea className="min-h-[220px] bg-muted/20 p-3" readOnly value={draftText} />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">版本控制</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {volumeVersions.length > 0 ? (
              <>
                <select className="w-full rounded-md border bg-background p-2 text-sm" value={selectedVersionId} onChange={(event) => onSelectedVersionChange(event.target.value)}>
                  {volumeVersions.map((version) => (
                    <option key={version.id} value={version.id}>
                      V{version.version} · {versionStatusLabel(version.status)}
                    </option>
                  ))}
                </select>
                {selectedVersion ? (
                  <div className="rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">V{selectedVersion.version}</span>
                      <Badge variant={versionStatusVariant(selectedVersion.status)}>
                        {versionStatusLabel(selectedVersion.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">创建时间：{new Date(selectedVersion.createdAt).toLocaleString()}</div>
                    <div className="mt-1 line-clamp-4 text-xs text-muted-foreground">{selectedVersion.diffSummary || "暂无差异摘要"}</div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-xs text-muted-foreground">还没有卷版本，请先保存草稿版本。</div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCreateDraftVersion} disabled={isCreatingDraftVersion || volumes.length === 0}>
                {isCreatingDraftVersion ? "保存中..." : "保存为草稿版本"}
              </Button>
              <Button variant="outline" onClick={onLoadSelectedVersionToDraft} disabled={!selectedVersionId}>覆盖当前草稿</Button>
              <Button variant="secondary" onClick={onActivateVersion} disabled={isActivatingVersion || !selectedVersionId}>
                {isActivatingVersion ? "生效中..." : "设为生效版"}
              </Button>
              <Button variant="outline" onClick={onFreezeVersion} disabled={isFreezingVersion || !selectedVersionId}>
                {isFreezingVersion ? "冻结中..." : "冻结当前版本"}
              </Button>
              <Button variant="outline" onClick={onLoadVersionDiff} disabled={isLoadingVersionDiff || !selectedVersionId}>
                {isLoadingVersionDiff ? "加载中..." : "查看版本差异"}
              </Button>
            </div>
            {diffResult ? (
              <div className="rounded-md border p-2 text-xs">
                <div className="font-medium">差异预览 V{diffResult.version}</div>
                <div className="text-muted-foreground">变更卷 {diffResult.changedVolumeCount} | 波及章节 {diffResult.changedChapterCount} | 变更行数 {diffResult.changedLines}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">影响分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <AiButton variant="outline" onClick={onAnalyzeDraftImpact} disabled={isAnalyzingDraftImpact || volumes.length === 0}>
                {isAnalyzingDraftImpact ? "分析中..." : "分析当前草稿"}
              </AiButton>
              <AiButton variant="outline" onClick={onAnalyzeVersionImpact} disabled={isAnalyzingVersionImpact || !selectedVersionId}>
                {isAnalyzingVersionImpact ? "分析中..." : "分析当前版本"}
              </AiButton>
            </div>
            {impactResult ? (
              <div className="rounded-md border p-2 text-xs">
                <div className="font-medium">卷级影响预览</div>
                <div className="text-muted-foreground">影响卷 {impactResult.affectedVolumeCount} | 波及章节 {impactResult.affectedChapterCount} | 变更行数 {impactResult.changedLines}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">建议在生效前先做卷级影响分析。</div>
            )}
          </CardContent>
        </Card>
      </div>
    </details>
  );
}
