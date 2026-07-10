import type {
  Character,
  CharacterCastRole,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationMode,
  SupplementalCharacterGenerationResult,
} from "@ai-novel/shared";
import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { refineSupplementalCharacter } from "@/api/novel/characters";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

const CAST_ROLE_LABELS: Record<CharacterCastRole, string> = {
  protagonist: "主角",
  antagonist: "主对手",
  ally: "同盟",
  foil: "镜像角色",
  mentor: "导师",
  love_interest: "情感牵引",
  pressure_source: "压力源",
  catalyst: "催化者",
};

const CHARACTER_GENDER_LABELS: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未知",
};

const SUPPLEMENTAL_MODE_LABELS: Record<SupplementalCharacterGenerationMode, string> = {
  auto: "AI 判断",
  linked: "关系补位",
  independent: "独立补位",
};

function getCastRoleLabel(castRole?: CharacterCastRole | "auto" | null): string {
  if (!castRole || castRole === "auto") {
    return "AI 判断";
  }
  return CAST_ROLE_LABELS[castRole] ?? castRole;
}

function getCharacterGenderLabel(gender?: string | null): string {
  if (!gender) {
    return "未知";
  }
  return CHARACTER_GENDER_LABELS[gender] ?? gender;
}

function getSupplementalRelationLabel(
  candidate: SupplementalCharacterCandidate,
  relation: SupplementalCharacterCandidate["relations"][number],
): string {
  if (relation.sourceName === candidate.name) {
    return relation.targetName;
  }
  if (relation.targetName === candidate.name) {
    return relation.sourceName;
  }
  return `${relation.sourceName} -> ${relation.targetName}`;
}

interface CharacterSupplementalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  novelId: string;
  characters: Character[];
  supplementalMode: SupplementalCharacterGenerationMode;
  onSupplementalModeChange: (mode: SupplementalCharacterGenerationMode) => void;
  supplementalAnchorIds: string[];
  onToggleSupplementalAnchor: (characterId: string) => void;
  supplementalTargetRole: CharacterCastRole | "auto";
  onSupplementalTargetRoleChange: (role: CharacterCastRole | "auto") => void;
  supplementalCount: "auto" | "1" | "2" | "3";
  onSupplementalCountChange: (count: "auto" | "1" | "2" | "3") => void;
  supplementalPrompt: string;
  onSupplementalPromptChange: (value: string) => void;
  supplementalUseWorldContext: boolean;
  onSupplementalUseWorldContextChange: (value: boolean) => void;
  supplementalPreCheck?: { warnings: string[]; missingFields: string[] };
  onGenerate: () => void;
  isGenerating: boolean;
  supplementalStatusMessage: string;
  supplementalResult: SupplementalCharacterGenerationResult | null;
  onApplyCandidate: (candidate: SupplementalCharacterCandidate) => void;
  isApplying: boolean;
}

export default function CharacterSupplementalDialog(props: CharacterSupplementalDialogProps) {
  const {
    isOpen,
    onOpenChange,
    novelId,
    characters,
    supplementalMode,
    onSupplementalModeChange,
    supplementalAnchorIds,
    onToggleSupplementalAnchor,
    supplementalTargetRole,
    onSupplementalTargetRoleChange,
    supplementalCount,
    onSupplementalCountChange,
    supplementalPrompt,
    onSupplementalPromptChange,
    supplementalUseWorldContext,
    onSupplementalUseWorldContextChange,
    supplementalPreCheck,
    onGenerate,
    isGenerating,
    supplementalStatusMessage,
    supplementalResult,
    onApplyCandidate,
    isApplying,
  } = props;
  const [preCheckDismissed, setPreCheckDismissed] = useState(false);
  const hasWarnings = Boolean(supplementalPreCheck && supplementalPreCheck.warnings.length > 0 && !preCheckDismissed);

  // 微调候选角色
  const [refineTarget, setRefineTarget] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [refinedCandidates, setRefinedCandidates] = useState<Record<string, SupplementalCharacterCandidate>>({});

  const refineMutation = useMutation({
    mutationFn: ({ candidate, adjustment }: { candidate: SupplementalCharacterCandidate; adjustment: string }) =>
      refineSupplementalCharacter(novelId, candidate, adjustment),
    onSuccess: (response, variables) => {
      if (response.data) {
        setRefinedCandidates((prev) => ({ ...prev, [variables.candidate.name]: response.data! }));
        toast.success(`已调整「${variables.candidate.name}」。`);
        setRefineTarget(null);
        setRefineInput("");
      }
    },
    onError: () => toast.error("角色调整失败，请重试。"),
  });

  const getCandidate = useCallback(
    (candidate: SupplementalCharacterCandidate): SupplementalCharacterCandidate =>
      refinedCandidates[candidate.name] ?? candidate,
    [refinedCandidates],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-0 pt-6">
          <DialogTitle>补充角色</DialogTitle>
          <DialogDescription>
            适合在已有角色系统基础上补一个缺位人物。你可以指定"从现有关系衍生"或"生成相对独立角色"，也可以直接交给 AI 判断。
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 pb-6 pt-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] xl:overflow-hidden">
          <div className="space-y-4 rounded-2xl border p-4 xl:min-h-0 xl:overflow-y-auto">
            <div className="space-y-1">
              <div className="font-medium">补位方式</div>
              <div className="text-xs text-muted-foreground">
                默认推荐"AI 判断"，只有你很确定要补哪类人时再手动指定。
              </div>
            </div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={supplementalMode}
              onChange={(event) => onSupplementalModeChange(event.target.value as SupplementalCharacterGenerationMode)}
            >
              <option value="auto">AI 判断当前更需要哪种补位</option>
              <option value="linked">基于现有角色衍生关系角色</option>
              <option value="independent">生成相对独立角色</option>
            </select>

            {characters.length > 0 && supplementalMode !== "independent" ? (
              <div className="space-y-2">
                <div className="font-medium">参考已有角色</div>
                <div className="text-xs text-muted-foreground">
                  可不选；不选时 AI 会自己判断应该围绕谁补位。
                </div>
                <div className="max-h-40 space-y-2 overflow-auto rounded-xl border bg-muted/15 p-3">
                  {characters.map((character) => (
                    <label key={character.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={supplementalAnchorIds.includes(character.id)}
                        onChange={() => onToggleSupplementalAnchor(character.id)}
                      />
                      <span>
                        {character.name}
                        <span className="ml-1 text-xs text-muted-foreground">({character.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="font-medium">期望角色功能</div>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={supplementalTargetRole}
                  onChange={(event) => onSupplementalTargetRoleChange(event.target.value as CharacterCastRole | "auto")}
                >
                  <option value="auto">AI 判断</option>
                  <option value="protagonist">主角</option>
                  <option value="antagonist">主对手</option>
                  <option value="ally">同盟</option>
                  <option value="foil">镜像角色</option>
                  <option value="mentor">导师</option>
                  <option value="love_interest">情感牵引</option>
                  <option value="pressure_source">压力源</option>
                  <option value="catalyst">催化者</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="font-medium">生成数量</div>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={supplementalCount}
                  onChange={(event) => onSupplementalCountChange(event.target.value as "auto" | "1" | "2" | "3")}
                >
                  <option value="auto">AI 判断</option>
                  <option value="1">1 个</option>
                  <option value="2">2 个</option>
                  <option value="3">3 个</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">额外说明</div>
              <Textarea
                className="min-h-[140px]"
                placeholder="例如：我想补一个能持续给主角施压、但又不是纯反派的人；或补一个和母亲线相关的旧识。"
                value={supplementalPrompt}
                onChange={(event) => onSupplementalPromptChange(event.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={supplementalUseWorldContext}
                onChange={(event) => onSupplementalUseWorldContextChange(event.target.checked)}
              />
              基于本书世界生成
            </label>

            {hasWarnings ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <div className="font-medium">以下素材字段尚未补充，可能影响生成质量：</div>
                <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
                  {supplementalPreCheck!.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreCheckDismissed(true)}>
                    无视警告，继续生成
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <AiButton
                onClick={onGenerate}
                disabled={isGenerating || hasWarnings || (supplementalMode === "linked" && characters.length === 0)}
              >
                {isGenerating ? "生成中..." : "生成补充角色候选"}
              </AiButton>
              <Badge variant="outline">数量不选时由 AI 自行判断</Badge>
              <Badge variant="outline">关系角色会优先围绕现有角色补位</Badge>
            </div>

            {supplementalStatusMessage ? (
              <div className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                {supplementalStatusMessage}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border p-4 xl:min-h-0 xl:overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">候选结果</div>
              {supplementalResult ? <Badge variant="outline">{supplementalResult.candidates.length} 个候选</Badge> : null}
              {supplementalResult?.mode ? <Badge variant="outline">本轮模式：{SUPPLEMENTAL_MODE_LABELS[supplementalResult.mode]}</Badge> : null}
            </div>
            {supplementalResult?.planningSummary ? (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-muted-foreground">
                AI 判断：{supplementalResult.planningSummary}
              </div>
            ) : null}

            {isGenerating ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                正在分析当前角色网并生成补位候选...
              </div>
            ) : supplementalResult?.candidates.length ? (
              <div className="space-y-3">
                {supplementalResult.candidates.map((rawCandidate) => {
                  const candidate = getCandidate(rawCandidate);
                  const isRefining = refineMutation.isPending && refineTarget === candidate.name;
                  const isAdjusting = refineTarget === candidate.name;
                  return (
                  <div key={rawCandidate.name} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{candidate.name}</div>
                          <Badge variant="outline">{candidate.role}</Badge>
                          <Badge variant="secondary">{getCastRoleLabel(candidate.castRole)}</Badge>
                          <Badge variant="outline">性别：{getCharacterGenderLabel(candidate.gender)}</Badge>
                          {refinedCandidates[rawCandidate.name] ? <Badge variant="secondary">已调整</Badge> : null}
                        </div>
                        <div className="text-sm text-muted-foreground">{candidate.summary}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onApplyCandidate(candidate)}
                          disabled={isApplying || isRefining}
                        >
                          {isApplying ? "创建中..." : "创建这个角色"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRefineTarget(isAdjusting ? null : candidate.name)}
                          disabled={isRefining}
                        >
                          {isAdjusting ? "取消调整" : "调整"}
                        </Button>
                      </div>
                    </div>

                    {isAdjusting ? (
                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">输入调整指令，例如"性格改为更外向"、"背景改为农村出身"</div>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-md border bg-background p-2 text-sm"
                            placeholder="描述你想调整的内容..."
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && refineInput.trim()) {
                                refineMutation.mutate({ candidate: rawCandidate, adjustment: refineInput.trim() });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={isRefining || !refineInput.trim()}
                            onClick={() => refineMutation.mutate({ candidate: rawCandidate, adjustment: refineInput.trim() })}
                          >
                            {isRefining ? "调整中..." : "确认调整"}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                        <div>故事作用：{candidate.storyFunction}</div>
                        <div>与主角关系：{candidate.relationToProtagonist || "AI 未指定"}</div>
                        <div>外在目标：{candidate.outerGoal || "待补全"}</div>
                        <div>当前目标：{candidate.currentGoal || "待补全"}</div>
                      </div>
                      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                        <div>第一印象：{candidate.firstImpression || "待补全"}</div>
                        <div>核心恐惧：{candidate.fear || "待补全"}</div>
                        <div>错误信念：{candidate.misbelief || "待补全"}</div>
                        <div>补位原因：{candidate.whyNow || "AI 未额外说明"}</div>
                      </div>
                    </div>

                    {candidate.relations.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">建议同步的关系</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {candidate.relations.map((relation, index) => (
                            <div key={`${candidate.name}-${relation.sourceName}-${relation.targetName}-${index}`} className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                              <div className="font-medium text-foreground">{getSupplementalRelationLabel(candidate, relation)}</div>
                              <div>表层关系：{relation.surfaceRelation}</div>
                              {relation.hiddenTension ? <div>隐藏张力：{relation.hiddenTension}</div> : null}
                              {relation.conflictSource ? <div>冲突来源：{relation.conflictSource}</div> : null}
                              {relation.nextTurnPoint ? <div>下一反转点：{relation.nextTurnPoint}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                        这名角色更偏向独立补位，不强制写入角色关系。
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-muted-foreground">
                先说明你想补哪类角色，或直接交给 AI 判断，再生成候选。
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
