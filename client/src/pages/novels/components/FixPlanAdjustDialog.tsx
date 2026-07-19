import { useState, useCallback } from "react";
import { Loader2, Wrench } from "lucide-react";
import type { GlobalReviewIssue } from "@/api/novel/globalReview";
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

interface FixPlanAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: GlobalReviewIssue | null;
  onConfirm: (userInstruction: string) => void;
  isSubmitting: boolean;
}

export function FixPlanAdjustDialog({
  open,
  onOpenChange,
  issue,
  onConfirm,
  isSubmitting,
}: FixPlanAdjustDialogProps) {
  const [approach, setApproach] = useState("");
  const [risks, setRisks] = useState("");

  const handleOpen = useCallback(() => {
    if (issue) {
      setApproach(issue.fixDirection || "");
      setRisks("");
    }
  }, [issue]);

  if (!issue) return null;

  const handleConfirm = () => {
    const parts: string[] = [];
    if (approach.trim()) parts.push(`修复方案：${approach.trim()}`);
    if (risks.trim()) parts.push(`注意事项：${risks.trim()}`);
    onConfirm(parts.join("\n") || issue.fixDirection || "按审校建议修复");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) handleOpen();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>调整修复方案</DialogTitle>
          <DialogDescription>
            修改修复方案后，系统将基于你的调整重新执行修复。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">问题摘要</p>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              修复方案
            </label>
            <Textarea
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              rows={4}
              placeholder="描述期望的修复方式..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              注意事项（可选）
            </label>
            <Textarea
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              rows={2}
              placeholder="补充约束条件或需要避免的改动..."
            />
          </div>

          <p className="text-xs text-muted-foreground">
            提交后，系统将基于以上调整重新执行章节修复。修复结果可在章节编辑页面查看。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wrench className="mr-1 h-3.5 w-3.5" />
            )}
            提交修复
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
