import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/api/queryKeys";
import { getChapterRepairVersions, type ChapterRepairVersion } from "@/api/novel/chapters";

interface RepairDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelId: string;
  chapterId: string;
  isRepairing: boolean;
  tokenUsage?: {
    llmCallCount: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  } | null;
}

function formatTokenCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export default function RepairDetailDialog({
  open,
  onOpenChange,
  novelId,
  chapterId,
  isRepairing,
  tokenUsage,
}: RepairDetailDialogProps) {
  const [activeVersion, setActiveVersion] = useState<string>("");
  const [liveTokenUsage, setLiveTokenUsage] = useState(tokenUsage);

  const { data: versionsData, refetch: refetchVersions } = useQuery({
    queryKey: queryKeys.novels.chapterRepairVersions(novelId, chapterId),
    queryFn: () => getChapterRepairVersions(novelId, chapterId),
    enabled: open && Boolean(novelId && chapterId),
  });

  const versions = versionsData?.data?.versions ?? [];

  useEffect(() => {
    if (tokenUsage) {
      setLiveTokenUsage(tokenUsage);
    }
  }, [tokenUsage]);

  // 每 3s 刷新 token 统计（修复进行中时）
  useEffect(() => {
    if (!isRepairing || !open) return;
    const timer = setInterval(() => {
      refetchVersions();
    }, 3000);
    return () => clearInterval(timer);
  }, [isRepairing, open, refetchVersions]);

  // 自动切换到最新版本
  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[versions.length - 1];
      setActiveVersion(String(latest.versionIndex));
    }
  }, [versions]);

  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const originalContent = latestVersion?.content ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-[600px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l bg-background p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            修复详情
            {isRepairing && liveTokenUsage && (
              <Badge variant="outline" className="text-xs">
                Token: {formatTokenCount(liveTokenUsage.totalTokens)}
              </Badge>
            )}
            {!isRepairing && liveTokenUsage && (
              <Badge variant="secondary" className="text-xs">
                Token: {formatTokenCount(liveTokenUsage.totalTokens)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            查看修复历史版本、Token 消耗和内容对比。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {versions.length === 0 ? (
            <EmptyState className="h-full p-5">
              {isRepairing ? "修复进行中，版本将在此处显示..." : "暂无修复版本记录"}
            </EmptyState>
          ) : (
            <Tabs value={activeVersion} onValueChange={setActiveVersion} className="flex h-full flex-col">
              <TabsList className="mx-5 mt-4 flex-wrap justify-start gap-1">
                {versions.map((v) => (
                  <TabsTrigger key={v.id} value={String(v.versionIndex)} className="text-xs">
                    版本 {v.versionIndex}
                  </TabsTrigger>
                ))}
              </TabsList>
              {versions.map((v) => (
                <TabsContent key={v.id} value={String(v.versionIndex)} className="flex-1 overflow-hidden px-5 pb-5 pt-2">
                  <div className="h-full overflow-y-auto">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{v.repairMode ?? "unknown"}</Badge>
                        <span>{new Date(v.createdAt).toLocaleString()}</span>
                        {v.userInstruction && (
                          <Badge variant="secondary">用户指令</Badge>
                        )}
                      </div>
                      {v.userInstruction && (
                        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
                          用户指令：{v.userInstruction}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap rounded-xl border bg-background/80 p-3 text-sm leading-6 text-foreground">
                        {v.content}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <div className="border-t border-border/70 px-5 py-3">
          <Button type="button" variant={isRepairing ? "ghost" : "outline"} className="w-full" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
