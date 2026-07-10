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
import { Textarea } from "@/components/ui/textarea";
import NovelAutoDirectorDialog from "./components/NovelAutoDirectorDialog";
import NovelBasicInfoForm from "./components/NovelBasicInfoForm";
import NovelCreateResourceRecommendationCard from "./components/NovelCreateResourceRecommendationCard";
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

      <Card>
        <CardHeader>
          <CardTitle>创建小说项目</CardTitle>
          <CardDescription>
            先把这本书写给谁、靠什么吸引追读、前 30 章要兑现什么定义清楚。这里的设置会直接影响后续主线规划、世界边界、写法建议和 AI 生成行为，创建后仍可继续调整。
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
            projectQuickStart={(
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
                onConfirmed={({ novelId, workflowTaskId, resumeTarget }) => {
                  const search = new URLSearchParams();
                  search.set("stage", resumeTarget?.stage ?? "story_macro");
                  if (workflowTaskId) {
                    search.set("directorTaskId", workflowTaskId);
                  }
                  if (resumeTarget?.chapterId) {
                    search.set("chapterId", resumeTarget.chapterId);
                  }
                  if (resumeTarget?.volumeId) {
                    search.set("volumeId", resumeTarget.volumeId);
                  }
                  navigate(`/novels/${novelId}/edit?${search.toString()}`);
                }}
              />
            )}
            titleQuickFill={(
              <NovelCreateTitleQuickFill
                basicForm={basicForm}
                onApplyTitle={(title) => setBasicForm((prev) => patchNovelBasicForm(prev, { title }))}
              />
            )}
            materialParse={(
              <MaterialParseDialog
                onApplyParsed={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
              />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
