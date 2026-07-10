import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Search } from "lucide-react";
import {
  getAtmosphereCards,
  getAtmosphereCardDetail,
  toggleAtmosphereCard,
  toggleAllAtmosphereCards,
  type AtmosphereCardMeta,
} from "@/api/atmosphereCards";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import MarkdownViewer from "@/components/common/MarkdownViewer";

function parseCsv(value: string): string[] {
  if (!value) return [];
  try { return JSON.parse(value) as string[]; } catch { return value.split(",").map((s) => s.trim()).filter(Boolean); }
}

export default function AtmosphereCardsPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const cardsQuery = useQuery({
    queryKey: queryKeys.styleEngine.atmosphereCards,
    queryFn: () => getAtmosphereCards(),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.styleEngine.atmosphereCardDetail(selectedKey ?? ""),
    queryFn: () => getAtmosphereCardDetail(selectedKey!),
    enabled: !!selectedKey,
  });

  const cards = cardsQuery.data?.cards ?? [];
  const categories = cardsQuery.data?.categories ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      toggleAtmosphereCard(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.atmosphereCards });
      toast("已更新氛围卡开关");
    },
  });

  const toggleAllMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleAllAtmosphereCards(enabled),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.atmosphereCards });
      toast(result.enabled ? `已开启全部 ${result.count} 张氛围卡` : `已关闭全部 ${result.count} 张氛围卡`);
    },
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.trim().toLowerCase();
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        parseCsv(c.triggerKeywords).some((k) => k.includes(q)),
    );
  }, [cards, searchQuery]);

  const allEnabled = useMemo(() => cards.every((c) => c.enabled), [cards]);
  const anyEnabled = useMemo(() => cards.some((c) => c.enabled), [cards]);

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 左侧：列表 */}
      <div className="flex w-[360px] flex-col gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              氛围写作卡
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllMutation.mutate(!allEnabled)}
                disabled={toggleAllMutation.isPending}
              >
                {allEnabled ? "全部关闭" : "全部开启"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {cards.filter((c) => c.enabled).length}/{cards.length} 启用
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索氛围卡..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-1 overflow-y-auto">
          {filtered.map((card) => (
            <button
              key={card.key}
              onClick={() => setSelectedKey(card.key)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedKey === card.key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{card.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {card.description}
                  </div>
                  {parseCsv(card.applicableEmotions).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {parseCsv(card.applicableEmotions).slice(0, 4).map((e) => (
                        <Badge key={e} variant="secondary" className="text-xs py-0">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Switch
                  checked={card.enabled}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ key: card.key, enabled: checked })
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：详情 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {detailQuery.data ? (
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold">{detailQuery.data.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{detailQuery.data.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {parseCsv(detailQuery.data.applicableEmotions).map((e) => (
                    <Badge key={e} variant="secondary" className="text-xs">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownViewer content={detailQuery.data.body} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background p-8 text-sm text-muted-foreground">
            选择一张氛围卡查看详情
          </div>
        )}
      </div>
    </div>
  );
}
