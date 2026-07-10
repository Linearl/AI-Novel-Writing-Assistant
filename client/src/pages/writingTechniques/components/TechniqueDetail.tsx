import { useQuery } from "@tanstack/react-query";
import { getWritingTechniqueByKey } from "@/api/writingTechniques";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TechniqueDetailProps {
  techniqueKey: string;
}

export default function TechniqueDetail({ techniqueKey }: TechniqueDetailProps) {
  const detailQuery = useQuery({
    queryKey: queryKeys.styleEngine.writingTechniqueDetail(techniqueKey),
    queryFn: () => getWritingTechniqueByKey(techniqueKey),
  });

  if (detailQuery.isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    );
  }

  const detail = detailQuery.data;
  if (!detail) {
    return (
      <Card className="flex h-full items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          加载失败
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">{detail.name}</CardTitle>
          {detail.category && <Badge variant="secondary">{detail.category}</Badge>}
          <Badge variant={detail.enabled ? "default" : "outline"}>
            {detail.enabled ? "已启用" : "未启用"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
      </CardHeader>
      <CardContent className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {detail.body.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="mt-6 mb-2 text-base font-semibold">{line.slice(3)}</h2>;
            }
            if (line.startsWith("### ")) {
              return <h3 key={i} className="mt-4 mb-1.5 text-sm font-semibold">{line.slice(4)}</h3>;
            }
            if (line.startsWith("- ")) {
              return <li key={i} className="ml-4 text-sm leading-relaxed">{line.slice(2)}</li>;
            }
            if (line.trim() === "") {
              return <br key={i} />;
            }
            return <p key={i} className="text-sm leading-relaxed">{line}</p>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
