import { useEffect, useRef, useState } from "react";
import type { UnifiedTaskDetail } from "@ai-novel/shared";
import type { PreviewChapter, QuickPreviewCandidate } from "@ai-novel/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BOOK_ANALYSIS_SECTIONS } from "@ai-novel/shared";
import { flattenGenreTreeOptions, getGenreTree } from "@/api/genre";
import { bootstrapNovelWorkflow } from "@/api/novelWorkflow";
import { createNovel } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { flattenStoryModeTreeOptions, getStoryModeTree } from "@/api/storyMode";
import { getWorldList } from "@/api/world";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import NovelAutoDirectorDialog from "./components/NovelAutoDirectorDialog";
import NovelBasicInfoForm from "./components/NovelBasicInfoForm";
import NovelCreateResourceRecommendationCard from "./components/NovelCreateResourceRecommendationCard";
import PathSelectionCard from "./components/PathSelectionCard";
import type { CreationPath } from "./components/PathSelectionCard";
import QuickPreviewPanel from "./components/QuickPreviewPanel";
import { BookFramingQuickFillButton } from "./components/basicInfoForm/BookFramingQuickFillButton";
import MaterialParseDialog from "./components/MaterialParseDialog";
import NovelCreateTitleQuickFill from "./components/titleWorkshop/NovelCreateTitleQuickFill";
import { useNovelContinuationSources } from "./hooks/useNovelContinuationSources";
import {
  buildNovelCreatePayload,
  createDefaultNovelBasicFormState,
  patchNovelBasicForm,
} from "./novelBasicInfo.shared";

export default function NovelCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [basicForm, setBasicForm] = useState(() => createDefaultNovelBasicFormState());
  const [inspiration, setInspiration] = useState("");
  const [restoredWorkflowTask, setRestoredWorkflowTask] = useState<UnifiedTaskDetail | null>(null);
  const [directorWorkflowTaskId, setDirectorWorkflowTaskId] = useState("");
  const [directorIdea, setDirectorIdea] = useState("");
  const [selectedPath, setSelectedPath] = useState<CreationPath | null>(null);
  const [materialImported, setMaterialImported] = useState(false);

  const workflowTaskIdFromQuery = searchParams.get("workflowTaskId") ?? "";
  const workflowMode = searchParams.get("mode");
  const lastBootstrapRef = useRef<string>("");

  const worldListQuery = useQuery({
    queryKey: queryKeys.worlds.all,
    queryFn: getWorldList,
  });

  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });
  const genreOptions = flattenGenreTreeOptions(genreTreeQuery.data?.data ?? []);
  const storyModeTreeQuery = useQuery({
    queryKey: queryKeys.storyModes.all,
    queryFn: getStoryModeTree,
  });
  const storyModeOptions = flattenStoryModeTreeOptions(storyModeTreeQuery.data?.data ?? []);

  const {
    sourceBookAnalysesQuery,
    sourceNovelOptions,
    sourceKnowledgeOptions,
    sourceNovelBookAnalysisOptions,
  } = useNovelContinuationSources("", basicForm);

  useEffect(() => {
    if (
      basicForm.writingMode !== "continuation"
      || !basicForm.continuationBookAnalysisId
    ) {
      return;
    }
    if (sourceBookAnalysesQuery.isLoading || sourceBookAnalysesQuery.isFetching) {
      return;
    }
    const exists = sourceNovelBookAnalysisOptions.some((item) => item.id === basicForm.continuationBookAnalysisId);
    if (exists) {
      return;
    }
    setBasicForm((prev) => ({
      ...prev,
      continuationBookAnalysisId: "",
      continuationBookAnalysisSections: [],
    }));
  }, [
    basicForm.continuationBookAnalysisId,
    basicForm.writingMode,
    sourceBookAnalysesQuery.isFetching,
    sourceBookAnalysesQuery.isLoading,
    sourceNovelBookAnalysisOptions,
  ]);

  const restoreWorkflowMutation = useMutation({
    mutationFn: () => bootstrapNovelWorkflow({
      workflowTaskId: workflowTaskIdFromQuery || undefined,
      lane: workflowMode === "director" ? "auto_director" : "manual_create",
    }),
    onSuccess: (response) => {
      const task = response.data;
      setRestoredWorkflowTask(task ?? null);
      if (!task) {
        return;
      }
      const seedPayload = (task.meta.seedPayload ?? null) as { basicForm?: Partial<typeof basicForm> } | null;
      if (seedPayload?.basicForm) {
        setBasicForm((prev) => patchNovelBasicForm(prev, seedPayload.basicForm ?? {}));
      }
      if (workflowMode === "director") {
        setDirectorWorkflowTaskId(task.id);
      }
      if (task.id !== workflowTaskIdFromQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("workflowTaskId", task.id);
          if (workflowMode === "director") {
            next.set("mode", "director");
          }
          return next;
        }, { replace: true });
      }
    },
  });

  useEffect(() => {
    if (!workflowTaskIdFromQuery) {
      setRestoredWorkflowTask(null);
      lastBootstrapRef.current = "";
      if (workflowMode !== "director") {
        setDirectorWorkflowTaskId("");
      }
      return;
    }
    const dedupeKey = `${workflowTaskIdFromQuery}:${workflowMode ?? ""}`;
    if (lastBootstrapRef.current === dedupeKey) {
      return;
    }
    lastBootstrapRef.current = dedupeKey;
    restoreWorkflowMutation.mutate();
  }, [workflowTaskIdFromQuery, workflowMode]);

  const createNovelMutation = useMutation({
    mutationFn: async () => {
      const task = await bootstrapNovelWorkflow({
        lane: "manual_create",
        title: basicForm.title,
        seedPayload: {
          basicForm,
        },
      });
      const created = await createNovel(buildNovelCreatePayload(basicForm));
      const novelId = created.data?.id;
      if (!novelId) {
        return {
          response: created,
          workflowTaskId: task.data?.id ?? "",
        };
      }
      const attached = await bootstrapNovelWorkflow({
        workflowTaskId: task.data?.id,
        novelId,
        lane: "manual_create",
        title: created.data?.title,
        seedPayload: {
          basicForm,
        },
      });
      return {
        response: created,
        workflowTaskId: attached.data?.id ?? task.data?.id ?? "",
      };
    },
    onSuccess: async ({ response, workflowTaskId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.all });
      if (response.data?.id) {
        const search = new URLSearchParams();
        search.set("stage", "basic");
        if (workflowTaskId) {
          search.set("workspaceTaskId", workflowTaskId);
        }
        navigate(`/novels/${response.data.id}/edit?${search.toString()}`);
      }
    },
  });

  const handleApplyCandidate = (candidate: QuickPreviewCandidate) => {
    setBasicForm((prev) => patchNovelBasicForm(prev, {
      title: candidate.title,
      description: candidate.synopsis,
      worldSetting: candidate.previewText,
    }));
  };

  const handleStartFormalCreation = (candidate: QuickPreviewCandidate, _chapters: PreviewChapter[]) => {
    setBasicForm((prev) => patchNovelBasicForm(prev, {
      title: candidate.title,
      description: candidate.synopsis,
      worldSetting: candidate.previewText,
    }));
    setDirectorIdea(candidate.synopsis);
    setDirectorWorkflowTaskId("");
  };

  const handlePathSelect = (path: CreationPath) => {
    setSelectedPath(path);
    if (path !== 'B') {
      setMaterialImported(false);
    }
  };

  const handleAutoDirectorConfirmed = (input: { novelId: string; workflowTaskId?: string; resumeTarget?: { stage?: "outline" | "chapter" | "character" | "structured" | "story_macro" | "basic" | "pipeline"; chapterId?: string | null; volumeId?: string | null } | null }) => {
    const search = new URLSearchParams();
    search.set("stage", input.resumeTarget?.stage ?? "story_macro");
    if (input.workflowTaskId) {
      search.set("directorTaskId", input.workflowTaskId);
    }
    if (input.resumeTarget?.chapterId) {
      search.set("chapterId", input.resumeTarget.chapterId);
    }
    if (input.resumeTarget?.volumeId) {
      search.set("volumeId", input.resumeTarget.volumeId);
    }
    navigate(`/novels/${input.novelId}/edit?${search.toString()}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>快速预览</CardTitle>
          <CardDescription>
            输入一句话灵感或简短描述，AI 会快速生成 3 个不同方向的候选方案（标题 + 梗概 + 正文预览），选定后自动填入创建表单。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              className="min-h-[80px]"
              placeholder="例如：一个社恐程序员意外穿越到修仙世界，发现自己写的代码变成了法术..."
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
            />
            <QuickPreviewPanel
              inspiration={inspiration}
              onApplyCandidate={handleApplyCandidate}
              onStartFormalCreation={handleStartFormalCreation}
            />
          </div>
        </CardContent>
      </Card>

      <PathSelectionCard
        selectedPath={selectedPath}
        onSelectPath={handlePathSelect}
      />

      {selectedPath === 'A' && (
        <NovelAutoDirectorDialog
          basicForm={basicForm}
          genreOptions={genreOptions}
          worldOptions={worldListQuery.data?.data ?? []}
          workflowTaskId={directorWorkflowTaskId}
          restoredTask={restoredWorkflowTask}
          initialOpen={workflowMode === "director" || Boolean(directorIdea)}
          initialIdea={directorIdea}
          onInitialIdeaConsumed={() => setDirectorIdea("")}
          onBasicFormChange={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
          onWorkflowTaskChange={(taskId) => {
            setDirectorWorkflowTaskId(taskId);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("workflowTaskId", taskId);
              next.set("mode", "director");
              return next;
            }, { replace: true });
          }}
          onConfirmed={handleAutoDirectorConfirmed}
        />
      )}

      {selectedPath === 'B' && !materialImported && (
        <Card>
          <CardHeader>
            <CardTitle>导入素材</CardTitle>
            <CardDescription>
              上传或粘贴你的长文本素材，AI将帮你解析为结构化字段
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialParseDialog
              onApplyParsed={(patch) => {
                setBasicForm((prev) => patchNovelBasicForm(prev, patch));
                setMaterialImported(true);
              }}
            />
          </CardContent>
        </Card>
      )}

      {selectedPath === 'B' && materialImported && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>完善小说信息</CardTitle>
                <CardDescription>
                  素材已导入，检查并完善表单后点击创建
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMaterialImported(false)}
              >
                重新导入素材
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <NovelBasicInfoForm
              basicForm={basicForm}
              genreOptions={genreOptions}
              storyModeOptions={storyModeOptions}
              worldOptions={worldListQuery.data?.data ?? []}
              sourceNovelOptions={sourceNovelOptions}
              sourceKnowledgeOptions={sourceKnowledgeOptions}
              sourceNovelBookAnalysisOptions={sourceNovelBookAnalysisOptions}
              isLoadingSourceNovelBookAnalyses={sourceBookAnalysesQuery.isLoading}
              availableBookAnalysisSections={[...BOOK_ANALYSIS_SECTIONS]}
              onFormChange={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
              onSubmit={() => createNovelMutation.mutate()}
              isSubmitting={createNovelMutation.isPending}
              submitLabel="创建并进入项目"
              showPublicationStatus={false}
              framingQuickFill={(
                <BookFramingQuickFillButton
                  basicForm={basicForm}
                  genreOptions={genreOptions}
                  onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
                />
              )}
              resourceRecommendation={(
                <NovelCreateResourceRecommendationCard
                  basicForm={basicForm}
                  onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
                />
              )}
              titleQuickFill={(
                <NovelCreateTitleQuickFill
                  basicForm={basicForm}
                  onApplyTitle={(title) => setBasicForm((prev) => patchNovelBasicForm(prev, { title }))}
                />
              )}
            />
          </CardContent>
        </Card>
      )}

      {selectedPath === 'C' && (
        <Card>
          <CardHeader>
            <CardTitle>填写小说信息</CardTitle>
            <CardDescription>
              逐步填写各字段，所有带"AI帮我填"的字段都可以让AI辅助生成
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NovelBasicInfoForm
              basicForm={basicForm}
              genreOptions={genreOptions}
              storyModeOptions={storyModeOptions}
              worldOptions={worldListQuery.data?.data ?? []}
              sourceNovelOptions={sourceNovelOptions}
              sourceKnowledgeOptions={sourceKnowledgeOptions}
              sourceNovelBookAnalysisOptions={sourceNovelBookAnalysisOptions}
              isLoadingSourceNovelBookAnalyses={sourceBookAnalysesQuery.isLoading}
              availableBookAnalysisSections={[...BOOK_ANALYSIS_SECTIONS]}
              onFormChange={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
              onSubmit={() => createNovelMutation.mutate()}
              isSubmitting={createNovelMutation.isPending}
              submitLabel="创建并进入项目"
              showPublicationStatus={false}
              framingQuickFill={(
                <BookFramingQuickFillButton
                  basicForm={basicForm}
                  genreOptions={genreOptions}
                  onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
                />
              )}
              resourceRecommendation={(
                <NovelCreateResourceRecommendationCard
                  basicForm={basicForm}
                  onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
                />
              )}
              titleQuickFill={(
                <NovelCreateTitleQuickFill
                  basicForm={basicForm}
                  onApplyTitle={(title) => setBasicForm((prev) => patchNovelBasicForm(prev, { title }))}
                />
              )}
            />
          </CardContent>
        </Card>
      )}

      {!selectedPath && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            请先选择你的创作方式
          </CardContent>
        </Card>
      )}
    </div>
  );
}
