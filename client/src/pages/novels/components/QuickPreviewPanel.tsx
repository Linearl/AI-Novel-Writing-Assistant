import { useState } from "react";
import type { PreviewChapter, QuickPreviewCandidate } from "@ai-novel/shared";
import { useMutation } from "@tanstack/react-query";
import { generatePreviewChapters, generateQuickPreview } from "@/api/novel/quickPreview";
import AiButton from "@/components/common/AiButton";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface QuickPreviewPanelProps {
  inspiration: string;
  onApplyCandidate: (candidate: QuickPreviewCandidate) => void;
  onStartFormalCreation: (candidate: QuickPreviewCandidate, chapters: PreviewChapter[]) => void;
}

export default function QuickPreviewPanel(props: QuickPreviewPanelProps) {
  const { inspiration, onApplyCandidate, onStartFormalCreation } = props;
  const llm = useLLMStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [expandedChapterIndex, setExpandedChapterIndex] = useState<number | null>(null);

  const previewMutation = useMutation({
    mutationFn: () => generateQuickPreview({
      inspiration,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: (response) => {
      if (!response.data?.candidates?.length) {
        toast.error("AI 没有返回可用的预览候选方案。");
        return;
      }
      toast.success("已生成 3 个方向候选，请选择一个继续。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "快速预览生成失败，请稍后再试。");
    },
  });

  const chaptersMutation = useMutation({
    mutationFn: (candidate: QuickPreviewCandidate) => generatePreviewChapters({
      inspiration,
      candidate,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: (response) => {
      if (!response.data?.chapters?.length) {
        toast.error("AI 没有返回可用的章节内容。");
        return;
      }
      toast.success("前 3 章预览已生成。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "章节生成失败，请稍后再试。");
    },
  });

  const candidates = previewMutation.data?.data?.candidates ?? [];
  const generatedChapters = chaptersMutation.data?.data?.chapters ?? [];

  const handleGenerate = () => {
    if (!inspiration.trim()) {
      toast.error("请先输入灵感内容。");
      return;
    }
    setSelectedIndex(null);
    previewMutation.mutate();
  };

  const handleSelectAndApply = () => {
    if (selectedIndex === null || !candidates[selectedIndex]) {
      return;
    }
    onApplyCandidate(candidates[selectedIndex]);
    toast.success("已将选定方向填入创建表单。");
  };

  const handleGenerateChapters = () => {
    if (selectedIndex === null || !candidates[selectedIndex]) {
      return;
    }
    chaptersMutation.mutate(candidates[selectedIndex]);
  };

  const handleStartFormalCreation = () => {
    if (selectedIndex === null || !candidates[selectedIndex] || generatedChapters.length === 0) {
      return;
    }
    onStartFormalCreation(candidates[selectedIndex], generatedChapters);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AiButton
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={previewMutation.isPending || !inspiration.trim()}
        >
          {previewMutation.isPending ? "生成中..." : "快速预览"}
        </AiButton>
        <span className="text-muted-foreground text-sm">
          输入灵感后点击生成 3 个方向候选
        </span>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {candidates.map((candidate, index) => (
              <button
                key={index}
                type="button"
                className={`rounded-lg border p-4 text-left transition-all ${
                  selectedIndex === index
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <h4 className="mb-2 line-clamp-1 text-sm font-semibold">
                  {candidate.title}
                </h4>
                <p className="text-muted-foreground mb-2 line-clamp-3 text-xs leading-relaxed">
                  {candidate.synopsis}
                </p>
                <p className="text-muted-foreground line-clamp-4 text-xs leading-relaxed opacity-70">
                  {candidate.previewText.slice(0, 120)}...
                </p>
              </button>
            ))}
          </div>

          {selectedIndex !== null && (
            <div className="rounded-lg border border-dashed p-4">
              <h4 className="mb-2 text-sm font-semibold">
                {candidates[selectedIndex].title}
              </h4>
              <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                {candidates[selectedIndex].synopsis}
              </p>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-foreground/80 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                  {candidates[selectedIndex].previewText}
                </p>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <AiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAndApply}
                >
                  填入表单
                </AiButton>
                <AiButton
                  type="button"
                  size="sm"
                  onClick={handleGenerateChapters}
                  disabled={chaptersMutation.isPending}
                >
                  {chaptersMutation.isPending ? "章节生成中..." : "生成前 3 章"}
                </AiButton>
              </div>
            </div>
          )}
        </div>
      )}

      {generatedChapters.length > 0 && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">前 3 章预览</h4>
            <AiButton
              type="button"
              size="sm"
              onClick={handleStartFormalCreation}
            >
              开始正式创作
            </AiButton>
          </div>
          <div className="space-y-3">
            {generatedChapters.map((chapter, index) => (
              <div key={index} className="rounded-md border bg-background p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedChapterIndex(
                    expandedChapterIndex === index ? null : index,
                  )}
                >
                  <span className="text-sm font-medium">
                    第 {index + 1} 章 {chapter.title}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {chapter.wordCount} 字
                    {expandedChapterIndex === index ? " ▲" : " ▼"}
                  </span>
                </button>
                {expandedChapterIndex === index && (
                  <div className="bg-muted/30 mt-2 max-h-80 overflow-y-auto rounded p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">
                      {chapter.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
