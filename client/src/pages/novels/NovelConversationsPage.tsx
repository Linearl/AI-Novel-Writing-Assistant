import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CreativeHubThread } from "@ai-novel/shared";
import { listCreativeHubThreads } from "@/api/creativeHub";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface NovelConversationsPageProps {
  novelId: string;
}

function threadStatusLabel(status: CreativeHubThread["status"]): string {
  switch (status) {
    case "idle": return "空闲";
    case "busy": return "运行中";
    case "interrupted": return "待确认";
    case "error": return "异常";
    default: return status;
  }
}

export default function NovelConversationsPage({ novelId }: NovelConversationsPageProps) {
  const threadsQuery = useQuery({
    queryKey: queryKeys.creativeHub.threads,
    queryFn: listCreativeHubThreads,
  });
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const novelThreads = useMemo(() => {
    const all = threadsQuery.data?.data ?? [];
    return all.filter((thread) => {
      if (thread.resourceBindings?.novelId !== novelId) return false;
      if (!showArchived && thread.archived) return false;
      return true;
    });
  }, [threadsQuery.data, novelId, showArchived]);

  const selectedThread = novelThreads.find((t) => t.id === selectedThreadId);

  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0 space-y-2 overflow-y-auto border-r pr-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">对话记录</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "隐藏归档" : "显示归档"}
          </Button>
        </div>
        {novelThreads.length === 0 ? (
          <EmptyState className="py-8">
            暂无对话记录
          </EmptyState>
        ) : (
          novelThreads.map((thread) => (
            <button
              key={thread.id}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                selectedThreadId === thread.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div className="font-medium truncate">{thread.title || "未命名对话"}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {threadStatusLabel(thread.status)}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(thread.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedThread ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedThread.title || "未命名对话"}</h2>
              <p className="text-xs text-muted-foreground">
                创建于 {new Date(selectedThread.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              对话详情功能将在后续版本完善。当前可查看对话列表和基本信息。
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            选择一个对话查看详情
          </div>
        )}
      </div>
    </div>
  );
}
