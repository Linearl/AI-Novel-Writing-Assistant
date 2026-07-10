import type { WritingTechnique } from "@/api/writingTechniques";

interface TechniqueStatsProps {
  techniques: WritingTechnique[];
}

export default function TechniqueStats({ techniques }: TechniqueStatsProps) {
  const total = techniques.length;
  const enabled = techniques.filter((t) => t.enabled).length;
  const categories = new Set(techniques.map((t) => t.category).filter(Boolean)).size;

  return (
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-muted-foreground">总计</span>{" "}
        <span className="font-semibold">{total}</span>
      </div>
      <div>
        <span className="text-muted-foreground">已启用</span>{" "}
        <span className="font-semibold text-green-600">{enabled}</span>
      </div>
      <div>
        <span className="text-muted-foreground">分类</span>{" "}
        <span className="font-semibold">{categories}</span>
      </div>
    </div>
  );
}
