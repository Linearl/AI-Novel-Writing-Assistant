import type { WritingTechnique } from "@/api/writingTechniques";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface TechniqueListProps {
  techniques: WritingTechnique[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onToggle: (key: string, enabled: boolean) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  句法: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  修辞: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  对话: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  叙事: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  描写: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  节奏: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function TechniqueList({ techniques, selectedKey, onSelect, onToggle }: TechniqueListProps) {
  if (techniques.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        没有匹配的技法
      </div>
    );
  }

  return (
    <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 320px)" }}>
      {techniques.map((t) => (
        <div
          key={t.key}
          className={cn(
            "group flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50",
            selectedKey === t.key && "border-primary/50 bg-muted/80",
          )}
          onClick={() => onSelect(t.key)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{t.name}</span>
              {t.category && (
                <Badge
                  variant="secondary"
                  className={cn("shrink-0 text-[10px] px-1.5 py-0", CATEGORY_COLORS[t.category])}
                >
                  {t.category}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
          </div>
          <Switch
            checked={t.enabled}
            onCheckedChange={(checked) => {
              onToggle(t.key, checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 mt-0.5"
          />
        </div>
      ))}
    </div>
  );
}
