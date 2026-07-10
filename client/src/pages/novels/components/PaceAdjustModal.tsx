import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { VolumePlan } from "@ai-novel/shared";
import { getNovelVolumeWorkspace, updateNovelVolumes } from "@/api/novel/volumes";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

interface PaceAdjustModalProps {
  novelId: string;
  chapter: {
    chapterOrder: number;
    title: string;
    conflictLevel: number | null;
    revealLevel: number | null;
    volumeId: string;
  };
  onClose: () => void;
  onSave: () => void;
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

export default function PaceAdjustModal({ novelId, chapter, onClose, onSave }: PaceAdjustModalProps) {
  const [conflictLevel, setConflictLevel] = useState(chapter.conflictLevel ?? 50);
  const [revealLevel, setRevealLevel] = useState(chapter.revealLevel ?? 50);

  const { data: volumeResponse } = useQuery({
    queryKey: queryKeys.novels.volumeWorkspace(novelId),
    queryFn: () => getNovelVolumeWorkspace(novelId),
    enabled: !!novelId,
  });

  const volumeDocument = volumeResponse?.data;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!volumeDocument) {
        throw new Error("卷数据未加载");
      }

      const updatedVolumes: VolumePlan[] = volumeDocument.volumes.map((volume) => ({
        ...volume,
        chapters: volume.chapters.map((cp) => {
          if (cp.volumeId === chapter.volumeId && cp.chapterOrder === chapter.chapterOrder) {
            return {
              ...cp,
              conflictLevel: Math.max(0, Math.min(100, Math.round(conflictLevel))),
              revealLevel: Math.max(0, Math.min(100, Math.round(revealLevel))),
            };
          }
          return cp;
        }),
      }));

      await updateNovelVolumes(novelId, {
        ...volumeDocument,
        volumes: updatedVolumes,
      });
    },
    onSuccess: () => {
      toast.success("节奏参数已保存");
      onSave();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "保存失败，请重试");
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            调整节奏 - Ch.{chapter.chapterOrder}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm text-muted-foreground">
          {chapter.title}
        </div>

        <div className="space-y-4 py-2">
          <Slider
            label="冲突等级 (Conflict Level)"
            value={conflictLevel}
            onChange={setConflictLevel}
          />
          <Slider
            label="揭示等级 (Reveal Level)"
            value={revealLevel}
            onChange={setRevealLevel}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            取消
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
