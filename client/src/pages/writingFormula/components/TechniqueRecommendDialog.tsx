import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, AppDialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { WritingTechniqueRecommendation } from "@/api/writingTechniques";

interface TechniqueRecommendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendations: WritingTechniqueRecommendation[];
  currentBoundKeys: Set<string>;
  onConfirm: (selectedKeys: string[]) => void;
  isConfirming: boolean;
}

export default function TechniqueRecommendDialog({
  open,
  onOpenChange,
  recommendations,
  currentBoundKeys,
  onConfirm,
  isConfirming,
}: TechniqueRecommendDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 每次推荐结果变化时默认全选
  useEffect(() => {
    if (recommendations.length > 0) {
      setSelected(new Set(recommendations.map((r) => r.key)));
    }
  }, [recommendations]);

  const selectAll = () => setSelected(new Set(recommendations.map((r) => r.key)));
  const deselectAll = () => setSelected(new Set());

  const handleToggle = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title="AI 为你推荐的写作技法"
        description={
          <div className="flex items-center justify-between gap-2">
            <span>根据你的写法画像，AI 挑选了以下技法。已默认全选，可逐个调整。</span>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="outline" onClick={selectAll}>
                全选
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                全关
              </Button>
            </div>
          </div>
        }
        bodyClassName="space-y-2"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              跳过
            </Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0 || isConfirming}>
              {isConfirming ? "正在应用..." : `通过（${selected.size} 条）`}
            </Button>
          </div>
        }
      >
        {recommendations.map((rec) => (
          <div
            key={rec.key}
            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30"
          >
            <Switch
              checked={selected.has(rec.key)}
              onCheckedChange={(checked) => handleToggle(rec.key, checked)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{rec.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {rec.category}
                </Badge>
                {currentBoundKeys.has(rec.key) && (
                  <Badge variant="secondary" className="text-[10px]">
                    已绑定
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{rec.description}</p>
              <p className="mt-1 text-xs italic text-muted-foreground/80">
                {rec.reason}
              </p>
            </div>
          </div>
        ))}
        {recommendations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            暂无推荐结果，请确认画像信息和技法库不为空。
          </p>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
