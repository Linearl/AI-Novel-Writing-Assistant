import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Link2Off, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getLinkedNovels, unlinkNovelFromWorld, type LinkedNovel } from "@/api/world";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

interface WorldUnlinkDialogProps {
  worldId: string;
  worldName: string;
}

export default function WorldUnlinkDialog({ worldId, worldName }: WorldUnlinkDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const linkedQuery = useQuery({
    queryKey: ["worlds", worldId, "linked-novels"],
    queryFn: () => getLinkedNovels(worldId),
    enabled: open,
    staleTime: 30_000,
  });

  const unlinkOneMutation = useMutation({
    mutationFn: (novelId: string) => unlinkNovelFromWorld(worldId, novelId),
    onSuccess: async (response) => {
      toast.success(`已解除关联（${response.data?.unlinked ?? 1} 个项目）。`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "linked-novels"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all }),
      ]);
    },
    onError: () => toast.error("解除关联失败。"),
  });

  const unlinkAllMutation = useMutation({
    mutationFn: () => unlinkNovelFromWorld(worldId),
    onSuccess: async (response) => {
      toast.success(`已批量解除 ${response.data?.unlinked ?? 0} 个项目的关联。`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "linked-novels"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all }),
      ]);
    },
    onError: () => toast.error("批量解除关联失败。"),
  });

  const novels = linkedQuery.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2Off className="mr-1 h-4 w-4" aria-hidden="true" />
          解除关联
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>解除项目关联</DialogTitle>
          <DialogDescription>
            以下项目正在使用「{worldName}」的世界设定。解除关联后，项目的世界数据会被清空，但世界样本库不受影响。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {linkedQuery.isLoading ? (
            <LoadingIndicator className="py-6" />
          ) : novels.length === 0 ? (
            <EmptyState className="py-6">当前没有项目使用这个世界。</EmptyState>
          ) : (
            <>
              <div className="max-h-60 space-y-2 overflow-auto">
                {novels.map((novel) => (
                  <div key={novel.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{novel.title}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {novel.linkedVia === "both" ? "双重关联" : novel.linkedVia === "worldId" ? "基础关联" : "副本关联"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={unlinkOneMutation.isPending}
                      onClick={() => unlinkOneMutation.mutate(novel.id)}
                    >
                      {unlinkOneMutation.isPending && unlinkOneMutation.variables === novel.id ? "解除中..." : "解除"}
                    </Button>
                  </div>
                ))}
              </div>

              {novels.length > 1 ? (
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="text-sm text-muted-foreground">
                    共 {novels.length} 个项目使用此世界
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={unlinkAllMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`确认解除全部 ${novels.length} 个项目的关联？项目世界数据会被清空。`)) {
                        unlinkAllMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {unlinkAllMutation.isPending ? "解除中..." : "批量解除全部"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
