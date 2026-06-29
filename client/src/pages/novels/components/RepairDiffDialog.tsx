---
description: "Diff 视图组件 - 对比修复前后内容"
---

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RepairDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalContent: string;
  repairedContent: string;
  chapterTitle?: string;
}

export default function RepairDiffDialog({
  open,
  onOpenChange,
  originalContent,
  repairedContent,
  chapterTitle,
}: RepairDiffDialogProps) {
  const [splitView, setSplitView] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-[900px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l bg-background p-0 sm:max-w-[900px]">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                修复对比
                {chapterTitle && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {chapterTitle}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                对比修复前后的章节内容差异。
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={splitView ? "default" : "outline"}
                onClick={() => setSplitView(true)}
              >
                并排
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!splitView ? "default" : "outline"}
                onClick={() => setSplitView(false)}
              >
                上下
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <ReactDiffViewer
                oldValue={originalContent}
                newValue={repairedContent}
                splitView={splitView}
                compareMethod={DiffMethod.WORDS}
                leftTitle="修复前"
                rightTitle="修复后"
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: "hsl(var(--background))",
                      addedBackground: "hsl(142 76% 36% / 0.1)",
                      removedBackground: "hsl(0 84% 60% / 0.1)",
                    },
                  },
                  line: {
                    fontSize: "13px",
                    lineHeight: "1.5",
                  },
                }}
              />
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-border/70 px-5 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
