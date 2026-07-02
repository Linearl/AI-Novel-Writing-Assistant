import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  BaseCharacter,
  Character,
  CharacterCastRole,
  CharacterGender,
  CharacterTimeline,
  CharacterVisibleProfileBatchResult,
  CharacterVisibleProfileSuggestion,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerateInput,
  SupplementalCharacterGenerationMode,
  SupplementalCharacterGenerationResult,
} from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import type { CharacterResourceLedgerItem } from "@ai-novel/shared/types/characterResource";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CharacterAssetWorkspace from "./CharacterAssetWorkspace";
import CharacterDiagnosticsSection from "./CharacterDiagnosticsSection";
import CharacterQuickCreateDialog from "./CharacterQuickCreateDialog";
import CharacterSupplementalDialog from "./CharacterSupplementalDialog";
import type { QuickCharacterCreatePayload } from "./characterPanel.utils";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";

interface QuickCharacterFormState {
  name: string;
  role: string;
}

interface CharacterFormState {
  name: string;
  role: string;
  gender: CharacterGender;
  personality: string;
  background: string;
  development: string;
  appearance: string;
  physique: string;
  attireStyle: string;
  signatureDetail: string;
  voiceTexture: string;
  presenceImpression: string;
  currentState: string;
  currentGoal: string;
}

interface NovelCharacterPanelProps {
  novelId: string;
  llmProvider?: LLMProvider;
  llmModel?: string;
  characterMessage: string;
  quickCharacterForm: QuickCharacterFormState;
  onQuickCharacterFormChange: (field: keyof QuickCharacterFormState, value: string) => void;
  onQuickCreateCharacter: (payload: QuickCharacterCreatePayload) => void;
  isQuickCreating: boolean;
  onGenerateSupplementalCharacters: (payload: SupplementalCharacterGenerateInput) => Promise<{
    data?: SupplementalCharacterGenerationResult;
    message?: string;
  }>;
  isGeneratingSupplementalCharacters: boolean;
  onApplySupplementalCharacter: (candidate: SupplementalCharacterCandidate) => Promise<{
    data?: { character?: Character; relationCount?: number };
    message?: string;
  }>;
  isApplyingSupplementalCharacter: boolean;
  characters: Character[];
  coreCharacterCount: number;
  baseCharacters: BaseCharacter[];
  selectedBaseCharacterId: string;
  onSelectedBaseCharacterChange: (id: string) => void;
  selectedBaseCharacter?: BaseCharacter;
  importedBaseCharacterIds: Set<string>;
  onImportBaseCharacter: () => void;
  isImportingBaseCharacter: boolean;
  selectedCharacterId: string;
  onSelectedCharacterChange: (id: string) => void;
  onDeleteCharacter: (characterId: string) => void;
  isDeletingCharacter: boolean;
  deletingCharacterId: string;
  onSyncTimeline: () => void;
  isSyncingTimeline: boolean;
  onSyncAllTimeline: () => void;
  isSyncingAllTimeline: boolean;
  onEvolveCharacter: () => void;
  isEvolvingCharacter: boolean;
  onGenerateVisibleProfile: (userGuidance?: string) => void;
  isGeneratingVisibleProfile: boolean;
  visibleProfileSuggestion?: CharacterVisibleProfileSuggestion | null;
  onApplyVisibleProfile: () => void;
  isApplyingVisibleProfile: boolean;
  onGenerateBatchVisibleProfiles: (userGuidance?: string) => void;
  isGeneratingBatchVisibleProfiles: boolean;
  batchVisibleProfileResult?: CharacterVisibleProfileBatchResult | null;
  onApplyBatchVisibleProfiles: () => void;
  isApplyingBatchVisibleProfiles: boolean;
  onWorldCheck: () => void;
  isCheckingWorld: boolean;
  selectedCharacter?: Character;
  characterResources?: CharacterResourceLedgerItem[];
  pendingCharacterResourceCount?: number;
  onBackfillCharacterResources?: () => void;
  isBackfillingCharacterResources?: boolean;
  characterForm: CharacterFormState;
  onCharacterFormChange: (field: keyof CharacterFormState, value: string) => void;
  onSaveCharacter: () => void;
  isSavingCharacter: boolean;
  timelineEvents: CharacterTimeline[];
  directorTakeoverEntry?: ReactNode;
}

export default function NovelCharacterPanel(props: NovelCharacterPanelProps) {
  const {
    novelId,
    llmProvider,
    llmModel,
    characterMessage,
    quickCharacterForm,
    onQuickCharacterFormChange,
    onQuickCreateCharacter,
    isQuickCreating,
    onGenerateSupplementalCharacters,
    isGeneratingSupplementalCharacters,
    onApplySupplementalCharacter,
    isApplyingSupplementalCharacter,
    characters,
    coreCharacterCount,
    baseCharacters,
    selectedBaseCharacterId,
    onSelectedBaseCharacterChange,
    selectedBaseCharacter,
    importedBaseCharacterIds,
    onImportBaseCharacter,
    isImportingBaseCharacter,
    selectedCharacterId,
    onSelectedCharacterChange,
    onDeleteCharacter,
    isDeletingCharacter,
    deletingCharacterId,
    onSyncTimeline,
    isSyncingTimeline,
    onSyncAllTimeline,
    isSyncingAllTimeline,
    onEvolveCharacter,
    isEvolvingCharacter,
    onGenerateVisibleProfile,
    isGeneratingVisibleProfile,
    visibleProfileSuggestion,
    onApplyVisibleProfile,
    isApplyingVisibleProfile,
    onGenerateBatchVisibleProfiles,
    isGeneratingBatchVisibleProfiles,
    batchVisibleProfileResult,
    onApplyBatchVisibleProfiles,
    isApplyingBatchVisibleProfiles,
    onWorldCheck,
    isCheckingWorld,
    selectedCharacter,
    characterResources = [],
    pendingCharacterResourceCount = 0,
    onBackfillCharacterResources,
    isBackfillingCharacterResources = false,
    characterForm,
    onCharacterFormChange,
    onSaveCharacter,
    isSavingCharacter,
    timelineEvents,
    directorTakeoverEntry,
  } = props;

  const [isCharacterEntryOpen, setIsCharacterEntryOpen] = useState(false);
  const [isSupplementalCharacterOpen, setIsSupplementalCharacterOpen] = useState(false);
  const [relationToProtagonist, setRelationToProtagonist] = useState("");
  const [storyFunction, setStoryFunction] = useState("");
  const [wizardKeywords, setWizardKeywords] = useState("");
  const [autoGenerateProfile, setAutoGenerateProfile] = useState(true);
  const [supplementalMode, setSupplementalMode] = useState<SupplementalCharacterGenerationMode>("auto");
  const [supplementalAnchorIds, setSupplementalAnchorIds] = useState<string[]>([]);
  const [supplementalTargetRole, setSupplementalTargetRole] = useState<CharacterCastRole | "auto">("auto");
  const [supplementalCount, setSupplementalCount] = useState<"auto" | "1" | "2" | "3">("auto");
  const [supplementalPrompt, setSupplementalPrompt] = useState("");
  const [supplementalUseWorldContext, setSupplementalUseWorldContext] = useState(true);
  const [supplementalStatusMessage, setSupplementalStatusMessage] = useState("");
  const [supplementalResult, setSupplementalResult] = useState<SupplementalCharacterGenerationResult | null>(null);
  const previousQuickCreating = useRef(isQuickCreating);

  useEffect(() => {
    if (previousQuickCreating.current && !isQuickCreating && !quickCharacterForm.name.trim()) {
      setIsCharacterEntryOpen(false);
      setRelationToProtagonist("");
      setStoryFunction("");
      setWizardKeywords("");
      setAutoGenerateProfile(true);
    }
    previousQuickCreating.current = isQuickCreating;
  }, [isQuickCreating, quickCharacterForm.name]);

  const handleOpenSupplementalDialog = () => {
    setIsSupplementalCharacterOpen(true);
    if (selectedCharacterId && supplementalAnchorIds.length === 0) {
      setSupplementalAnchorIds([selectedCharacterId]);
    }
  };

  const toggleSupplementalAnchor = (characterId: string) => {
    setSupplementalAnchorIds((prev) =>
      prev.includes(characterId)
        ? prev.filter((item) => item !== characterId)
        : [...prev, characterId],
    );
  };

  const handleGenerateSupplementalCharacters = async () => {
    if (supplementalMode === "linked" && characters.length === 0) {
      setSupplementalStatusMessage(`当前还没有已建角色，不能基于关系补充角色。可以先建一个核心角色，或改用“生成相对独立角色”。`);
      return;
    }

    try {
      const response = await onGenerateSupplementalCharacters({
        mode: supplementalMode,
        anchorCharacterIds: supplementalMode === "independent" ? [] : supplementalAnchorIds,
        targetCastRole: supplementalTargetRole,
        count: supplementalCount === "auto" ? undefined : Number(supplementalCount),
        userPrompt: supplementalPrompt.trim() || undefined,
        useWorldContext: supplementalUseWorldContext,
        worldFocusHints: supplementalUseWorldContext
          ? { forceCompliance: true }
          : undefined,
      });
      setSupplementalResult(response.data ?? null);
      setSupplementalStatusMessage(response.message ?? "补充角色候选已生成。");
    } catch (error) {
      setSupplementalStatusMessage(error instanceof Error ? error.message : "补充角色生成失败。");
    }
  };

  const handleApplySupplementalCharacter = async (candidate: SupplementalCharacterCandidate) => {
    try {
      const response = await onApplySupplementalCharacter(candidate);
      const createdName = response.data?.character?.name ?? candidate.name;
      const relationCount = response.data?.relationCount ?? 0;
      setSupplementalResult((prev) => prev
        ? {
          ...prev,
          candidates: prev.candidates.filter((item) => item.name !== candidate.name),
        }
        : prev);
      setSupplementalStatusMessage(
        response.message
        ?? `${createdName} 已加入当前小说${relationCount > 0 ? `，并同步 ${relationCount} 条关系` : ""}。`,
      );
    } catch (error) {
      setSupplementalStatusMessage(error instanceof Error ? error.message : "应用补充角色失败。");
    }
  };

  return (
    <div className="space-y-5">
      <DirectorTakeoverEntryPanel
        title="从角色准备接管"
        description="AI 会先判断角色资产是否齐备，再决定继续补角色还是按你的选择重跑当前步骤。"
        entry={directorTakeoverEntry}
      />
      {characterMessage ? <div className="text-sm text-muted-foreground">{characterMessage}</div> : null}

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/30">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Character Prep
              </div>
              <div className="text-2xl font-semibold tracking-tight text-foreground">
                日常主区只保留角色资产
              </div>
              <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
                新增角色和阵容重建都属于阶段性动作，不应该长期挤占角色页主区。这里把它们降成按需入口，把主要空间还给角色资产编辑。
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">已建角色</div>
                <div className="mt-2 text-2xl font-semibold">{characters.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">先把推动主线的人物占位补齐。</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">核心角色</div>
                <div className="mt-2 text-2xl font-semibold">{coreCharacterCount}</div>
                <div className="mt-1 text-xs text-muted-foreground">至少明确主角与主要对手。</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">当前焦点</div>
                <div className="mt-2 text-base font-semibold">{selectedCharacter?.name ?? "尚未选择角色"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedCharacter?.role || `${baseCharacters.length} 个基础角色可导入`}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-3">
            <Button onClick={() => setIsCharacterEntryOpen(true)}>新增角色</Button>
            <AiButton variant="outline" onClick={handleOpenSupplementalDialog}>
              补充角色
            </AiButton>
            <AiButton
              variant="secondary"
              onClick={onEvolveCharacter}
              disabled={isEvolvingCharacter || !selectedCharacterId}
            >
              {isEvolvingCharacter ? "演进中..." : "AI 演进当前状态"}
            </AiButton>
            <AiButton
              variant="outline"
              onClick={() => onGenerateVisibleProfile()}
              disabled={isGeneratingVisibleProfile || !selectedCharacterId}
            >
              {isGeneratingVisibleProfile ? "生成中..." : "AI 补全外显资料"}
            </AiButton>
            <Badge variant="outline">低频入口：新增角色 / 导入角色 / 补充角色</Badge>
            <div className="text-xs text-muted-foreground">
              日常编辑建议直接在下方"角色资产工作台"里处理。
            </div>
          </div>
        </CardContent>
      </Card>

      <CharacterQuickCreateDialog
        isOpen={isCharacterEntryOpen}
        onOpenChange={setIsCharacterEntryOpen}
        quickCharacterForm={quickCharacterForm}
        onQuickCharacterFormChange={onQuickCharacterFormChange}
        onQuickCreate={onQuickCreateCharacter}
        isQuickCreating={isQuickCreating}
        relationToProtagonist={relationToProtagonist}
        onRelationToProtagonistChange={setRelationToProtagonist}
        storyFunction={storyFunction}
        onStoryFunctionChange={setStoryFunction}
        wizardKeywords={wizardKeywords}
        onWizardKeywordsChange={setWizardKeywords}
        autoGenerateProfile={autoGenerateProfile}
        onAutoGenerateProfileChange={setAutoGenerateProfile}
        baseCharacters={baseCharacters}
        selectedBaseCharacterId={selectedBaseCharacterId}
        onSelectedBaseCharacterChange={onSelectedBaseCharacterChange}
        selectedBaseCharacter={selectedBaseCharacter}
        importedBaseCharacterIds={importedBaseCharacterIds}
        onImportBaseCharacter={onImportBaseCharacter}
        isImportingBaseCharacter={isImportingBaseCharacter}
      />

      <CharacterSupplementalDialog
        isOpen={isSupplementalCharacterOpen}
        onOpenChange={setIsSupplementalCharacterOpen}
        characters={characters}
        supplementalMode={supplementalMode}
        onSupplementalModeChange={setSupplementalMode}
        supplementalAnchorIds={supplementalAnchorIds}
        onToggleSupplementalAnchor={toggleSupplementalAnchor}
        supplementalTargetRole={supplementalTargetRole}
        onSupplementalTargetRoleChange={setSupplementalTargetRole}
        supplementalCount={supplementalCount}
        onSupplementalCountChange={setSupplementalCount}
        supplementalPrompt={supplementalPrompt}
        onSupplementalPromptChange={setSupplementalPrompt}
        supplementalUseWorldContext={supplementalUseWorldContext}
        onSupplementalUseWorldContextChange={setSupplementalUseWorldContext}
        onGenerate={handleGenerateSupplementalCharacters}
        isGenerating={isGeneratingSupplementalCharacters}
        supplementalStatusMessage={supplementalStatusMessage}
        supplementalResult={supplementalResult}
        onApplyCandidate={handleApplySupplementalCharacter}
        isApplying={isApplyingSupplementalCharacter}
      />

      <CharacterDiagnosticsSection
        novelId={novelId}
        characters={characters}
        selectedCharacter={selectedCharacter}
        selectedCharacterId={selectedCharacterId}
        onSelectedCharacterChange={onSelectedCharacterChange}
        llmProvider={llmProvider}
        llmModel={llmModel}
      />

      <CharacterAssetWorkspace
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onSelectedCharacterChange={onSelectedCharacterChange}
        onDeleteCharacter={onDeleteCharacter}
        isDeletingCharacter={isDeletingCharacter}
        deletingCharacterId={deletingCharacterId}
        selectedCharacter={selectedCharacter}
        characterForm={characterForm}
        onCharacterFormChange={onCharacterFormChange}
        onSaveCharacter={onSaveCharacter}
        isSavingCharacter={isSavingCharacter}
        timelineEvents={timelineEvents}
        onSyncTimeline={onSyncTimeline}
        isSyncingTimeline={isSyncingTimeline}
        onSyncAllTimeline={onSyncAllTimeline}
        isSyncingAllTimeline={isSyncingAllTimeline}
        onWorldCheck={onWorldCheck}
        isCheckingWorld={isCheckingWorld}
        onGenerateVisibleProfile={onGenerateVisibleProfile}
        isGeneratingVisibleProfile={isGeneratingVisibleProfile}
        visibleProfileSuggestion={visibleProfileSuggestion}
        onApplyVisibleProfile={onApplyVisibleProfile}
        isApplyingVisibleProfile={isApplyingVisibleProfile}
        onGenerateBatchVisibleProfiles={onGenerateBatchVisibleProfiles}
        isGeneratingBatchVisibleProfiles={isGeneratingBatchVisibleProfiles}
        batchVisibleProfileResult={batchVisibleProfileResult}
        onApplyBatchVisibleProfiles={onApplyBatchVisibleProfiles}
        isApplyingBatchVisibleProfiles={isApplyingBatchVisibleProfiles}
        characterResources={characterResources}
        pendingCharacterResourceCount={pendingCharacterResourceCount}
        onBackfillCharacterResources={onBackfillCharacterResources}
        isBackfillingCharacterResources={isBackfillingCharacterResources}
      />
    </div>
  );
}
