import { useState } from "react";
import type { ChapterEditStyleForkResult } from "@ai-novel/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StyleForkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ChapterEditStyleForkResult | null;
  isSaving: boolean;
  onConfirm: (profileName: string) => void;
}

export default function StyleForkConfirmDialog({
  open,
  onOpenChange,
  result,
  isSaving,
  onConfirm,
}: StyleForkConfirmDialogProps) {
  const [profileName, setProfileName] = useState("");

  if (!result) {
    return null;
  }

  const effectiveName = profileName.trim() || result.suggestedName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>提取风格画像</DialogTitle>
          <DialogDescription>
            根据你的编辑偏好，将生成新的风格画像并自动替换当前绑定。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">变更摘要： </span>
            {result.changeSummary}
          </div>

          <div className="space-y-1">
            <label htmlFor="profileName" className="text-sm font-medium">
              新画像名称
            </label>
            <input
              id="profileName"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={result.suggestedName}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              如不修改，将使用推荐名称：{result.suggestedName}
            </p>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <span className="font-medium">新画像将自动替换当前绑定。</span>
            <p className="mt-1 text-xs text-muted-foreground">
              原画像 ID：{result.originalProfileId}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm(effectiveName)} disabled={isSaving}>
            {isSaving ? "处理中..." : "确认创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
