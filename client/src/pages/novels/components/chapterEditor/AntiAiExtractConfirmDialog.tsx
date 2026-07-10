import { useState } from "react";
import type {
  AntiAiRuleDraftFields,
  ChapterEditAntiAiExtractResult,
} from "@ai-novel/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AntiAiExtractConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ChapterEditAntiAiExtractResult | null;
  isSaving: boolean;
  onConfirm: (drafts: AntiAiRuleDraftFields[]) => void;
}

export default function AntiAiExtractConfirmDialog({
  open,
  onOpenChange,
  result,
  isSaving,
  onConfirm,
}: AntiAiExtractConfirmDialogProps) {
  const [drafts, setDrafts] = useState<AntiAiRuleDraftFields[]>([]);

  // Sync drafts when result changes
  if (result && drafts.length === 0 && result.drafts.length > 0) {
    setDrafts(result.drafts);
  }

  const handleToggleDraft = (index: number) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d)),
    );
  };

  const handleUpdateDraft = (index: number, field: keyof AntiAiRuleDraftFields, value: string) => {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    );
  };

  const enabledDrafts = drafts.filter((d) => d.enabled);

  const handleConfirm = () => {
    onConfirm(enabledDrafts);
  };

  if (!result) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>提取反 AI 规则</DialogTitle>
          <DialogDescription>
            从你的编辑修改中识别出可复用的反 AI 规则。请确认后保存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">修改意图： </span>
            {result.intentSummary}
          </div>

          {enabledDrafts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              未从编辑中检测到可提取的反 AI 规则。
            </p>
          )}

          {drafts.map((draft, index) => (
            <div
              key={draft.key || index}
              className="rounded-md border p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={() => handleToggleDraft(index)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-sm">{draft.name}</span>
                  <span className="text-xs text-muted-foreground">
                    [{draft.type}] [{draft.severity}]
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{draft.description}</p>
              {draft.detectPatterns.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  检测模式：{draft.detectPatterns.join("、")}
                </p>
              )}
              {draft.promptInstruction && (
                <p className="text-xs text-muted-foreground">
                  生成指令：{draft.promptInstruction}
                </p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || enabledDrafts.length === 0}
          >
            {isSaving ? "保存中..." : `保存 ${enabledDrafts.length} 条规则`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
