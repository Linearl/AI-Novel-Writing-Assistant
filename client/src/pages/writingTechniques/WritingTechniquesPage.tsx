import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import {
  getWritingTechniques,
  toggleWritingTechnique,
  toggleAllWritingTechniques,
  type WritingTechnique,
} from "@/api/writingTechniques";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import TechniqueList from "./components/TechniqueList";
import TechniqueDetail from "./components/TechniqueDetail";
import TechniqueStats from "./components/TechniqueStats";

export default function WritingTechniquesPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const techniquesQuery = useQuery({
    queryKey: queryKeys.styleEngine.writingTechniques,
    queryFn: () => getWritingTechniques(),
  });

  const techniques = techniquesQuery.data?.techniques ?? [];
  const categories = techniquesQuery.data?.categories ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      toggleWritingTechnique(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.writingTechniques });
      toast("已更新技法开关");
    },
  });

  const toggleAllMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleAllWritingTechniques(enabled),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.writingTechniques });
      toast(result.enabled ? `已开启全部 ${result.count} 条技法` : `已关闭全部 ${result.count} 条技法`);
    },
  });

  const filtered = useMemo(() => {
    let result = techniques;
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q),
      );
    }
    return result;
  }, [techniques, categoryFilter, searchQuery]);

  const selected = selectedKey ? techniques.find((t) => t.key === selectedKey) ?? null : null;

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 左侧：列表 */}
      <div className="flex w-[360px] flex-col gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              文笔资料库
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TechniqueStats techniques={techniques} />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllMutation.mutate(true)}
                disabled={toggleAllMutation.isPending}
              >
                全部开启
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllMutation.mutate(false)}
                disabled={toggleAllMutation.isPending}
              >
                全部关闭
              </Button>
            </div>

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="搜索技法名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={categoryFilter === "all" ? "default" : "outline"}
                onClick={() => setCategoryFilter("all")}
              >
                全部 ({techniques.length})
              </Button>
              {categories.map((cat) => {
                const count = techniques.filter((t) => t.category === cat).length;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={categoryFilter === cat ? "default" : "outline"}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat} ({count})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 技法列表 */}
        <div className="flex-1 overflow-hidden">
          <TechniqueList
            techniques={filtered}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onToggle={(key, enabled) => toggleMutation.mutate({ key, enabled })}
          />
        </div>
      </div>

      {/* 右侧：详情 */}
      <div className="flex-1">
        {selected ? (
          <TechniqueDetail techniqueKey={selected.key} />
        ) : (
          <Card className="flex h-full items-center justify-center">
            <CardContent className="text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>选择左侧技法查看详情</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
