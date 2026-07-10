import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StyleBinding, StyleProfile } from "@ai-novel/shared";
import { apiClient } from "@/api/client";
import {
  createStyleBinding,
  deleteStyleBinding,
  deleteStyleProfile,
  detectStyleIssues,
  extractStyleFeaturesFromText,
  importStyleProfile,
  rewriteStyleIssues,
  testWriteWithStyleProfile,
  updateStyleProfile,
} from "@/api/styleEngine";
import { queryKeys } from "@/api/queryKeys";
import {
  buildProfileFeaturesFromDraft,
  buildRuleSetFromExtractedFeatures,
  normalizeCsv,
  parseJsonInput,
  prettyJson,
} from "./writingFormula.utils";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface WritingFormulaEditorState {
  name: string;
  description: string;
  category: string;
  tags: string;
  applicableGenres: string;
  sourceContent: string;
  extractedFeatures: import("@ai-novel/shared").StyleProfileFeature[];
  analysisMarkdown: string;
  narrativeRules: string;
  characterRules: string;
  languageRules: string;
  rhythmRules: string;
  antiAiRuleIds: string[];
}

export interface WritingFormulaBindingForm {
  targetType: StyleBinding["targetType"];
  novelId: string;
  chapterId: string;
  taskTargetId: string;
  priority: number;
  weight: number;
}

export interface WritingFormulaLlmConfig {
  provider: string;
  model: string;
  temperature: number;
}

// ─── Mutations hook ──────────────────────────────────────────────────────────

export interface WritingFormulaMutationsOptions {
  selectedProfileId: string;
  editor: WritingFormulaEditorState;
  bindingForm: WritingFormulaBindingForm;
  llm: WritingFormulaLlmConfig;
  detectInput: string;
  refreshStyleData: () => Promise<void>;
  setEditor: React.Dispatch<React.SetStateAction<WritingFormulaEditorState>>;
  setMessage: (msg: string) => void;
  setSelectedProfileId: (id: string) => void;
  setActiveWorkspaceDialog: (dialog: null | "editor" | "workbench" | "clean") => void;
  setTestWriteOutput: (output: string) => void;
  setRewritePreview: (text: string) => void;
  setImportDialogOpen: (open: boolean) => void;
}

export function useWritingFormulaMutations(opts: WritingFormulaMutationsOptions) {
  const queryClient = useQueryClient();
  const {
    selectedProfileId, editor, bindingForm, llm, detectInput,
    refreshStyleData,
    setEditor, setMessage, setSelectedProfileId,
    setActiveWorkspaceDialog, setTestWriteOutput, setRewritePreview,
    setImportDialogOpen,
  } = opts;

  const reextractFeaturesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId || !editor.sourceContent.trim()) {
        throw new Error("请先准备原文样本。");
      }
      return extractStyleFeaturesFromText({
        name: editor.name.trim() || "文本提取写法",
        category: editor.category || undefined,
        sourceText: editor.sourceContent,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      });
    },
    onSuccess: (response) => {
      const draft = response.data;
      if (!draft) return;
      const extractedFeatures = buildProfileFeaturesFromDraft(draft);
      const ruleSet = buildRuleSetFromExtractedFeatures(extractedFeatures);
      setEditor((prev) => ({
        ...prev,
        extractedFeatures,
        analysisMarkdown: draft.analysisMarkdown || prev.analysisMarkdown,
        narrativeRules: prettyJson(ruleSet.narrativeRules),
        characterRules: prettyJson(ruleSet.characterRules),
        languageRules: prettyJson(ruleSet.languageRules),
        rhythmRules: prettyJson(ruleSet.rhythmRules),
      }));
      setMessage(
        extractedFeatures.length > 0
          ? `已重新提取 ${extractedFeatures.length} 条特征，请确认后保存。`
          : "这次仍然没有生成可用特征，建议检查原文样本是否足够完整。",
      );
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) return;
      await updateStyleProfile(selectedProfileId, {
        name: editor.name,
        description: editor.description,
        category: editor.category,
        tags: normalizeCsv(editor.tags),
        applicableGenres: normalizeCsv(editor.applicableGenres),
        sourceContent: editor.sourceContent || undefined,
        extractedFeatures: editor.extractedFeatures,
        analysisMarkdown: editor.analysisMarkdown,
        narrativeRules: parseJsonInput(editor.narrativeRules),
        characterRules: parseJsonInput(editor.characterRules),
        languageRules: parseJsonInput(editor.languageRules),
        rhythmRules: parseJsonInput(editor.rhythmRules),
        antiAiRuleIds: editor.antiAiRuleIds,
      });
    },
    onSuccess: async () => {
      setMessage("写法资产保存完成。");
      await refreshStyleData();
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) => deleteStyleProfile(id),
    onSuccess: async (_response, deletedProfileId) => {
      setMessage("这套写法已删除。");
      if (deletedProfileId === selectedProfileId) {
        setSelectedProfileId("");
        setActiveWorkspaceDialog(null);
      }
      await refreshStyleData();
    },
  });

  const exportProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiClient.get(`/style-profiles/${profileId}/export`, {
        responseType: "blob",
      });
      const blob = response.data as Blob;
      const contentDisposition = response.headers?.["content-disposition"] ?? "";
      const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "style-profile.json";
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      setMessage("写法资产导出完成。");
    },
  });

  const importProfileMutation = useMutation({
    mutationFn: async (payload: { profileData: Record<string, unknown>; conflictStrategy: "overwrite" | "create_new" | "skip" }) => {
      return importStyleProfile(payload);
    },
    onSuccess: async (response) => {
      setMessage(response.data?.message ?? "导入完成。");
      setImportDialogOpen(false);
      await refreshStyleData();
    },
  });

  const createBindingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) return;
      const targetId = bindingForm.targetType === "chapter"
        ? bindingForm.chapterId
        : bindingForm.targetType === "task"
          ? bindingForm.taskTargetId
          : bindingForm.novelId;
      await createStyleBinding({
        styleProfileId: selectedProfileId,
        targetType: bindingForm.targetType,
        targetId,
        priority: bindingForm.priority,
        weight: bindingForm.weight,
      });
    },
    onSuccess: async () => {
      setMessage("这套写法会参与目标对象的生成。");
      await refreshStyleData();
    },
  });

  const deleteBindingMutation = useMutation({
    mutationFn: (id: string) => deleteStyleBinding(id),
    onSuccess: async () => {
      await refreshStyleData();
    },
  });

  const testWriteMutation = useMutation({
    mutationFn: () => {
      if (!selectedProfileId) throw new Error("请先选择写法资产。");
      return testWriteWithStyleProfile(selectedProfileId, {
        mode: "generate",
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      });
    },
    onSuccess: (response) => setTestWriteOutput(response.data?.output ?? ""),
  });

  const detectionMutation = useMutation({
    mutationFn: () => {
      if (!selectedProfileId) throw new Error("请先选择写法资产。");
      return detectStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) throw new Error("请先选择写法资产。");
      const report = (await detectStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      })).data;
      if (!report || report.violations.length === 0) {
        return { data: { content: detectInput } };
      }
      return rewriteStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        issues: report.violations.map((item) => ({
          ruleName: item.ruleName,
          excerpt: item.excerpt,
          suggestion: item.suggestion,
        })),
        provider: llm.provider,
        model: llm.model,
        temperature: 0.5,
      });
    },
    onSuccess: (response) => {
      setRewritePreview(response.data?.content ?? "");
      setMessage("修订稿已经生成，可以继续在去 AI 味里检查和调整。");
    },
  });

  return {
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
  };
}
