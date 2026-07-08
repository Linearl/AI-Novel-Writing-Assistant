import { useState } from "react";
import type { QuickPreviewCandidate } from "@ai-novel/shared/types/novelQuickPreview";
import { useMutation } from "@tanstack/react-query";
import { generateQuickPreview } from "@/api/novel/quickPreview";
import AiButton from "@/components/common/AiButton";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface QuickPreviewPanelProps {
  inspiration: string;
  onApplyCandidate: (candidate: QuickPreviewCandidate) => void;
}

export default function QuickPreviewPanel(props: QuickPreviewPanelProps) {
  const { inspiration, onApplyCandidate } = props;
  const llm = useLLMStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  const candidates = previewMutation.data?.data?.candidates ?? [];

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
              <div className="mt-3 flex justify-end">
                <AiButton
                  type="button"
                  size="sm"
                  onClick={handleSelectAndApply}
                >
                  选用此方向
                </AiButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
