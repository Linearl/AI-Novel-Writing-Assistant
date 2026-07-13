import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, WandSparkles } from "lucide-react";
import type { WorldBindingSupport, WorldStructuredData } from "@ai-novel/shared";
import { modifyWorldStructure, type WorldStructureModifyResult } from "@/api/world";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface WorldAIAssistantDialogProps {
  worldId: string;
  currentStructure: WorldStructuredData | null;
  currentBindingSupport: WorldBindingSupport | null;
  onApply: (structure: WorldStructuredData, bindingSupport: WorldBindingSupport) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "idle" | "loading" | "preview" | "error";

export default function WorldAIAssistantDialog({
  worldId,
  currentStructure,
  currentBindingSupport,
  onApply,
  open,
  onOpenChange,
}: WorldAIAssistantDialogProps) {
  const [intent, setIntent] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<WorldStructureModifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const llm = useLLMStore();

  const analyzeMutation = useMutation({
    mutationFn: () =>
      modifyWorldStructure(worldId, {
        intent,
        structure: currentStructure!,
        bindingSupport: currentBindingSupport ?? undefined,
        provider: llm.provider,
        model: llm.model || undefined,
      }),
    onSuccess: (data) => {
      const resultData = data.data;
      if (!resultData || resultData.changes.length === 0) {
        setPhase("error");
        setErrorMessage(resultData?.summary || "无法理解修改意图，请换个说法试试。");
        return;
      }
      setResult(resultData);
      setPhase("preview");
    },
    onError: (error) => {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "AI 分析失败，请重试。");
    },
  });

  const handleAnalyze = () => {
    if (!intent.trim() || !currentStructure) return;
    setPhase("loading");
    setErrorMessage("");
    analyzeMutation.mutate();
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result.modifiedStructure, result.bindingSupport);
    toast.success("AI 修改已应用到手册草稿，请确认后保存。");
    handleClose();
  };

  const handleClose = () => {
    setIntent("");
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
    onOpenChange(false);
  };

  const handleRetry = () => {
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-primary" />
            AI 世界助手
          </DialogTitle>
          <DialogDescription>
            描述你想对世界设定做的修改，AI 将分析意图并给出修改方案。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {phase === "idle" && (
            <>
              <Textarea
                placeholder="例如：将拾光花坊改名为玫瑰时光花坊、删除废弃仓库势力、在规则中添加新的公理..."
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                rows={4}
                className="resize-none"
              />
              {!currentStructure && (
                <p className="text-sm text-muted-foreground">
                  世界结构尚未创建，请先生成或导入世界。
                </p>
              )}
            </>
          )}

          {phase === "loading" && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">AI 正在分析修改意图...</span>
            </div>
          )}

          {phase === "error" && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              {errorMessage}
            </div>
          )}

          {phase === "preview" && result && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium">{result.summary}</p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.changes.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-md border border-border/60 bg-background p-3"
                  >
                    <span className="mt-0.5 text-lg">🔸</span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {change.section === "factions" ? "势力" : change.section === "locations" ? "地点" : change.section}
                      </span>
                      <p className="text-sm">{change.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!intent.trim() || !currentStructure}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <WandSparkles className="mr-2 h-4 w-4" />
                    分析修改意图
                  </>
                )}
              </Button>
            </>
          )}

          {phase === "loading" && (
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
          )}

          {phase === "error" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleRetry}>
                重新修改
              </Button>
            </>
          )}

          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={handleRetry}>
                重新修改
              </Button>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleApply}>
                应用修改
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
