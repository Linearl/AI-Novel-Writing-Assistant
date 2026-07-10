import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  StyleBinding,
  StyleProfile,
  StyleProfileFeature,
} from "@ai-novel/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNovelDetail, getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import {
  getAntiAiRules,
  getStyleBindings,
  getStyleProfiles,
  getStyleTemplates,
} from "@/api/styleEngine";
import { useLLMStore } from "@/store/llmStore";
import WritingFormulaAdvancedWorkspace from "./components/WritingFormulaAdvancedWorkspace";
import WritingFormulaBookStyleFlow from "./components/WritingFormulaBookStyleFlow";
import WritingFormulaCleanPanel from "./components/WritingFormulaCleanPanel";
import WritingFormulaCreateDialog from "./components/WritingFormulaCreateDialog";
import WritingFormulaLanding from "./components/WritingFormulaLanding";
import WritingFormulaWorkbenchPanel from "./components/WritingFormulaWorkbenchPanel";
import {
  useWritingFormulaCreateFlow,
} from "./useWritingFormulaCreateFlow";
import { useWritingFormulaDialogFocus, type WritingFormulaDialogFocusIntent } from "./useWritingFormulaDialogFocus";
import { useWritingFormulaMutations } from "./useWritingFormulaMutations";
import { buildLandingProfileItems } from "./writingFormulaLandingItems";
import { buildRuleSetFromExtractedFeatures, prettyJson } from "./writingFormula.utils";
import { normalizeWritingFormulaMode } from "./writingFormulaV2.shared";

type WorkspaceDialog = null | "editor" | "workbench" | "clean";

export default function WritingFormulaPage() {
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editorDialogRef = useRef<HTMLDivElement | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [activeWorkspaceDialog, setActiveWorkspaceDialog] = useState<WorkspaceDialog>(
    searchParams.get("profileId") ? "editor" : null,
  );
  const [editorFocusIntent, setEditorFocusIntent] = useState<WritingFormulaDialogFocusIntent>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(searchParams.get("mode") === "imitate");
  const [bookStyleNovelId, setBookStyleNovelId] = useState(searchParams.get("novelId") ?? "");
  const [editor, setEditor] = useState({
    name: "",
    description: "",
    category: "",
    tags: "",
    applicableGenres: "",
    sourceContent: "",
    extractedFeatures: [] as StyleProfileFeature[],
    analysisMarkdown: "",
    narrativeRules: "{}",
    characterRules: "{}",
    languageRules: "{}",
    rhythmRules: "{}",
    antiAiRuleIds: [] as string[],
  });
  const [bindingForm, setBindingForm] = useState({
    targetType: "novel" as StyleBinding["targetType"],
    novelId: "",
    chapterId: "",
    taskTargetId: "",
    priority: 1,
    weight: 1,
  });
  const [testWriteForm, setTestWriteForm] = useState({
    mode: "generate" as "generate" | "rewrite",
    topic: "",
    sourceText: "",
    targetLength: 1200,
  });
  const [testWriteOutput, setTestWriteOutput] = useState("");
  const [detectInput, setDetectInput] = useState("");
  const [rewritePreview, setRewritePreview] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importConflictStrategy, setImportConflictStrategy] = useState<"overwrite" | "create_new" | "skip">("create_new");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMode = normalizeWritingFormulaMode(searchParams.get("mode"));
  const incomingProfileId = searchParams.get("profileId") ?? "";
  const incomingSource = searchParams.get("source") ?? "";

  const profilesQuery = useQuery({
    queryKey: queryKeys.styleEngine.profiles,
    queryFn: getStyleProfiles,
  });
  const templatesQuery = useQuery({
    queryKey: queryKeys.styleEngine.templates,
    queryFn: getStyleTemplates,
  });
  const antiAiRulesQuery = useQuery({
    queryKey: queryKeys.styleEngine.antiAiRules,
    queryFn: getAntiAiRules,
  });
  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, 100),
    queryFn: () => getNovelList({ page: 1, limit: 100 }),
  });
  const novelDetailQuery = useQuery({
    queryKey: queryKeys.novels.detail(bindingForm.novelId || "none"),
    queryFn: () => getNovelDetail(bindingForm.novelId),
    enabled: Boolean(bindingForm.novelId),
  });
  const bindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "selected-none"),
    queryFn: () => getStyleBindings(selectedProfileId ? { styleProfileId: selectedProfileId } : undefined),
  });
  const allBindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.bindings("all"),
    queryFn: () => getStyleBindings(),
  });

  const profiles = profilesQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const antiAiRules = antiAiRulesQuery.data?.data ?? [];
  const bindings = bindingsQuery.data?.data ?? [];
  const allBindings = allBindingsQuery.data?.data ?? [];
  const novelOptions = (novelListQuery.data?.data?.items ?? []).map((novel) => ({
    id: novel.id,
    title: novel.title,
  }));
  const novelTitleMap = useMemo(
    () => Object.fromEntries(novelOptions.map((novel) => [novel.id, novel.title])),
    [novelOptions],
  );
  const chapterOptions = (novelDetailQuery.data?.data?.chapters ?? []).map((chapter) => ({
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
  }));
  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );
  const landingProfileItems = useMemo(
    () => buildLandingProfileItems({ profiles, allBindings, novelTitleMap }),
    [allBindings, novelTitleMap, profiles],
  );

  const openWorkspaceDialog = (dialog: Exclude<WorkspaceDialog, null>, profileId?: string) => {
    const targetProfileId = profileId || selectedProfileId || profiles[0]?.id || "";
    if (targetProfileId) {
      setSelectedProfileId(targetProfileId);
    }
    setActiveWorkspaceDialog(dialog);
    setEditorFocusIntent(dialog === "editor" ? "editor" : null);
  };

  const handleCreatedProfile = (profile: StyleProfile, successMessage: string) => {
    setSelectedProfileId(profile.id);
    setMessage(successMessage);
    setCreateDialogOpen(false);
    openWorkspaceDialog("editor", profile.id);
  };

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!bindingForm.novelId && novelOptions.length > 0) {
      setBindingForm((prev) => ({ ...prev, novelId: novelOptions[0].id }));
    }
  }, [bindingForm.novelId, novelOptions]);

  useEffect(() => {
    setBookStyleNovelId(searchParams.get("novelId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (activeMode !== "imitate") {
      return;
    }

    setCreateDialogOpen(true);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("mode");
    setSearchParams(nextSearchParams, { replace: true });
  }, [activeMode, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeMode !== "clean") {
      return;
    }

    const focusProfileId = selectedProfileId || profiles[0]?.id || "";
    if (!focusProfileId) {
      return;
    }

    openWorkspaceDialog("clean", focusProfileId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("mode");
    setSearchParams(nextSearchParams, { replace: true });
  }, [activeMode, profiles, searchParams, selectedProfileId, setSearchParams]);

  useEffect(() => {
    if (!incomingProfileId || profiles.length === 0) {
      return;
    }

    const incomingProfile = profiles.find((item) => item.id === incomingProfileId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("profileId");
    nextSearchParams.delete("source");

    if (!incomingProfile) {
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    setSelectedProfileId(incomingProfile.id);
    setActiveWorkspaceDialog("editor");
    setEditorFocusIntent("editor");
    if (incomingSource === "book-analysis") {
      setMessage(`写法“${incomingProfile.name}”来自拆书结果，你可以继续检查规则、试写，或绑定到目标。`);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [incomingProfileId, incomingSource, profiles, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }

    setEditor({
      name: selectedProfile.name,
      description: selectedProfile.description ?? "",
      category: selectedProfile.category ?? "",
      tags: selectedProfile.tags.join(", "),
      applicableGenres: selectedProfile.applicableGenres.join(", "),
      sourceContent: selectedProfile.sourceContent ?? "",
      extractedFeatures: selectedProfile.extractedFeatures ?? [],
      analysisMarkdown: selectedProfile.analysisMarkdown ?? "",
      narrativeRules: prettyJson(selectedProfile.narrativeRules),
      characterRules: prettyJson(selectedProfile.characterRules),
      languageRules: prettyJson(selectedProfile.languageRules),
      rhythmRules: prettyJson(selectedProfile.rhythmRules),
      antiAiRuleIds: selectedProfile.antiAiRules.map((rule) => rule.id),
    });
  }, [selectedProfile]);

  useEffect(() => {
    setTestWriteOutput("");
    setDetectInput("");
    setRewritePreview("");
  }, [selectedProfileId]);

  useWritingFormulaDialogFocus({
    dialogRef: editorDialogRef,
    open: activeWorkspaceDialog === "editor",
    focusIntent: editorFocusIntent,
    focusKey: selectedProfileId,
    setFocusIntent: setEditorFocusIntent,
  });

  const createFlow = useWritingFormulaCreateFlow({
    llm,
    refreshStyleData,
    onImmediateProfileCreated: handleCreatedProfile,
    onAutoSavedProfileReady: (profileId, successMessage) => {
      setSelectedProfileId(profileId);
      setMessage(successMessage);
      setCreateDialogOpen(false);
      openWorkspaceDialog("editor", profileId);
    },
    onExtractionTaskQueued: (task) => {
      setCreateDialogOpen(false);
      setMessage(`写法提取任务“${task.title}”已提交。系统会在后台自动提取并保存，完成后会自动打开结果。`);
    },
    onFlowMessage: setMessage,
  });

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      createFlow.resetCreateFlow();
    }
  };

  async function refreshStyleData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.profiles }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.templates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.antiAiRules }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "selected-none") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings("all") }),
    ]);
  }

  const mutations = useWritingFormulaMutations({
    selectedProfileId,
    editor,
    bindingForm,
    llm: { provider: llm.provider, model: llm.model, temperature: llm.temperature },
    detectInput,
    refreshStyleData,
    setEditor,
    setMessage,
    setSelectedProfileId,
    setActiveWorkspaceDialog,
    setTestWriteOutput,
    setRewritePreview,
    setImportDialogOpen,
  });

  const {
    reextractFeaturesMutation,
    saveProfileMutation,
    deleteProfileMutation,
    exportProfileMutation,
    importProfileMutation,
    createBindingMutation,
    deleteBindingMutation,
    testWriteMutation,
    detectionMutation,
    rewriteMutation,
  } = mutations;

  const handleImportFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const raw = (parsed.profile && typeof parsed.profile === "object" ? parsed.profile : parsed) as Record<string, unknown>;

      if (!raw || typeof raw !== "object" || !raw.name) {
        setMessage("导入失败：JSON 文件格式不正确，缺少必需的 name 字段。");
        return;
      }

      importProfileMutation.mutate({
        profileData: raw,
        conflictStrategy: importConflictStrategy,
      });
    } catch {
      setMessage("导入失败：无法解析 JSON 文件。");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    testWriteMutation.reset();
    detectionMutation.reset();
    rewriteMutation.reset();
  }, [selectedProfileId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Style Engine V2</div>
          <div className="text-2xl font-semibold tracking-tight text-slate-950">写法引擎</div>
        </div>
        <OpenInCreativeHubButton bindings={{ styleProfileId: selectedProfileId || null }} label="把这套写法带去创作中枢" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
        >
          导入写法
        </Button>
      </div>

      {message ? <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm">{message}</div> : null}

      {activeMode === "book-style" ? (
        <WritingFormulaBookStyleFlow
          novelId={bookStyleNovelId}
          novelTitle={bookStyleNovelId ? novelTitleMap[bookStyleNovelId] : undefined}
          onOpenAdvanced={() => openWorkspaceDialog("editor", selectedProfileId)}
          onOpenCreate={() => setCreateDialogOpen(true)}
        />
      ) : null}

      <WritingFormulaLanding
        onOpenCreate={() => setCreateDialogOpen(true)}
        onSelectProfile={setSelectedProfileId}
        onEditProfile={(profileId) => openWorkspaceDialog("editor", profileId)}
        onOpenWorkbench={(profileId) => openWorkspaceDialog("workbench", profileId)}
        onUseProfileForClean={(profileId) => openWorkspaceDialog("clean", profileId)}
        onDeleteProfile={(profileId) => {
          const profile = profiles.find((item) => item.id === profileId);
          const profileName = profile?.name ?? "这套写法";
          const confirmed = window.confirm(`确认删除“${profileName}”吗？删除后无法恢复。`);
          if (!confirmed) {
            return;
          }
          deleteProfileMutation.mutate(profileId);
        }}
        onExportProfile={(profileId) => exportProfileMutation.mutate(profileId)}
        deletePending={deleteProfileMutation.isPending}
        profileItems={landingProfileItems}
        selectedProfileId={selectedProfileId}
      />

      <WritingFormulaCreateDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        form={createFlow.form}
        onFormChange={createFlow.onFormChange}
        templates={templates}
        createManualPending={createFlow.createManualPending}
        createFromBriefPending={createFlow.createFromBriefPending}
        createFromTemplatePending={createFlow.createFromTemplatePending}
        extractTaskSubmitting={createFlow.extractTaskSubmitting}
        activeExtractionTask={createFlow.activeExtractionTask}
        knowledgeDocuments={createFlow.knowledgeDocuments}
        knowledgeDocumentsLoading={createFlow.knowledgeDocumentsLoading}
        selectedKnowledgeDocument={createFlow.selectedKnowledgeDocument}
        selectedKnowledgeDocumentLoading={createFlow.selectedKnowledgeDocumentLoading}
        bookAnalyses={createFlow.bookAnalyses}
        bookAnalysesLoading={createFlow.bookAnalysesLoading}
        selectedPresetKey={createFlow.selectedPresetKey}
        onCreateManual={createFlow.onCreateManual}
        onCreateFromBrief={createFlow.onCreateFromBrief}
        onCreateFromTemplate={createFlow.onCreateFromTemplate}
        onPresetChange={createFlow.onPresetChange}
        onSubmitExtractionTask={createFlow.onSubmitExtractionTask}
        onOpenTaskCenter={(task) => navigate(`/tasks?kind=style_extraction&id=${task.id}`)}
      />

      <Dialog
        open={activeWorkspaceDialog === "editor"}
        onOpenChange={(open) => {
          setActiveWorkspaceDialog(open ? "editor" : null);
          if (!open) {
            setEditorFocusIntent(null);
          }
        }}
      >
        <DialogContent ref={editorDialogRef} className="!flex h-[88vh] w-[min(1180px,96vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <DialogTitle>编辑当前写法</DialogTitle>
            <DialogDescription>
              这里专门整理写法本身的设定说明。应用测试和去 AI 味已经拆到独立入口，避免混在一个窗口里。
            </DialogDescription>
          </DialogHeader>

          <div className="h-full min-h-0 overflow-hidden p-6 pt-4">
            <WritingFormulaAdvancedWorkspace
              antiAiRules={antiAiRules}
              selectedProfile={selectedProfile}
              editor={editor}
              savePending={saveProfileMutation.isPending}
              deletePending={deleteProfileMutation.isPending}
              reextractPending={reextractFeaturesMutation.isPending}
              onEditorChange={(patch) => setEditor((prev) => ({ ...prev, ...patch }))}
              onToggleExtractedFeature={(featureId, checked) => setEditor((prev) => {
                const extractedFeatures = prev.extractedFeatures.map((feature) => (
                  feature.id === featureId ? { ...feature, enabled: checked } : feature
                ));
                const ruleSet = buildRuleSetFromExtractedFeatures(extractedFeatures);
                return {
                  ...prev,
                  extractedFeatures,
                  narrativeRules: prettyJson(ruleSet.narrativeRules),
                  characterRules: prettyJson(ruleSet.characterRules),
                  languageRules: prettyJson(ruleSet.languageRules),
                  rhythmRules: prettyJson(ruleSet.rhythmRules),
                };
              })}
              onReextractFeatures={() => reextractFeaturesMutation.mutate()}
              onToggleAntiAiRule={(ruleId, checked) => setEditor((prev) => ({
                ...prev,
                antiAiRuleIds: checked
                  ? Array.from(new Set([...prev.antiAiRuleIds, ruleId]))
                  : prev.antiAiRuleIds.filter((item) => item !== ruleId),
              }))}
              onSave={() => saveProfileMutation.mutate()}
              onDelete={() => selectedProfile && deleteProfileMutation.mutate(selectedProfile.id)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeWorkspaceDialog === "workbench"}
        onOpenChange={(open) => setActiveWorkspaceDialog(open ? "workbench" : null)}
      >
        <DialogContent className="!flex h-[84vh] w-[min(1080px,94vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <DialogTitle>当前写法的应用与测试</DialogTitle>
            <DialogDescription>
              这里专门处理绑定到小说、章节和试写验证，不修改写法字段本身。
            </DialogDescription>
          </DialogHeader>

          <div className="h-full min-h-0 overflow-auto p-6 pt-4">
            <WritingFormulaWorkbenchPanel
              selectedProfileId={selectedProfileId}
              bindingForm={bindingForm}
              bindings={bindings}
              novelOptions={novelOptions}
              chapterOptions={chapterOptions}
              createBindingPending={createBindingMutation.isPending}
              onBindingFormChange={(patch) => setBindingForm((prev) => ({ ...prev, ...patch }))}
              onCreateBinding={() => createBindingMutation.mutate()}
              onDeleteBinding={(bindingId) => deleteBindingMutation.mutate(bindingId)}
              testWriteForm={testWriteForm}
              testWriteOutput={testWriteOutput}
              testWritePending={testWriteMutation.isPending}
              onTestWriteFormChange={(patch) => setTestWriteForm((prev) => ({ ...prev, ...patch }))}
              onRunTestWrite={() => testWriteMutation.mutate()}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeWorkspaceDialog === "clean"}
        onOpenChange={(open) => setActiveWorkspaceDialog(open ? "clean" : null)}
      >
        <DialogContent className="!flex h-[84vh] w-[min(980px,92vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <DialogTitle>去 AI 味</DialogTitle>
            <DialogDescription>
              这里专门做正文检测和修正，不进入写法字段编辑，也不混入绑定和试写操作。
            </DialogDescription>
          </DialogHeader>

          <div className="h-full min-h-0 overflow-auto p-6 pt-4">
            <WritingFormulaCleanPanel
              selectedProfile={selectedProfile}
              detectInput={detectInput}
              detectionReport={detectionMutation.data?.data ?? null}
              detectionPending={detectionMutation.isPending}
              rewritePending={rewriteMutation.isPending}
              rewritePreview={rewritePreview}
              onDetectInputChange={setDetectInput}
              onDetect={() => detectionMutation.mutate()}
              onRewrite={() => rewriteMutation.mutate()}
            />
          </div>
        </DialogContent>
      </Dialog>

      {importDialogOpen ? (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFileSelect}
        />
      ) : null}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ display: importDialogOpen ? undefined : "none" }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setImportDialogOpen(false)} />
        <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-950">导入写法资产</div>
              <div className="mt-1 text-sm text-slate-500">从 JSON 文件导入写法资产</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">冲突处理策略</label>
              <select
                value={importConflictStrategy}
                onChange={(e) => setImportConflictStrategy(e.target.value as "overwrite" | "create_new" | "skip")}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="create_new">新建（同名时自动加后缀）</option>
                <option value="overwrite">覆盖（替换同名资产）</option>
                <option value="skip">跳过（同名时保留原有）</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importProfileMutation.isPending}
              >
                {importProfileMutation.isPending ? "导入中..." : "选择文件导入"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
