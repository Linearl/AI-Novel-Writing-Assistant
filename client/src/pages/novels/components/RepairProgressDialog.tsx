import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface RepairProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamContent: string;
  isStreaming: boolean;
  onAbort?: () => void;
}

export default function RepairProgressDialog({
  open,
  onOpenChange,
  streamContent,
  isStreaming,
  onAbort,
}: RepairProgressDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && open) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamContent, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">
            章节修复 {isStreaming ? "（进行中）" : "（已完成）"}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
        </div>
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4"
          style={{ minHeight: "200px", maxHeight: "60vh" }}
        >
          {streamContent ? (
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {streamContent}
            </pre>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              等待修复内容...
            </div>
          )}
        </div>
        {isStreaming && onAbort ? (
          <div className="border-t px-4 py-3">
            <Button size="sm" variant="destructive" onClick={onAbort}>
              中断修复
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
