import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getWritingTechniques,
  getProfileTechniqueBindings,
  setProfileTechniqueBindings,
  recommendTechniquesForProfile,
  type WritingTechnique,
  type WritingTechniqueRecommendation,
} from "@/api/writingTechniques";
import { queryKeys } from "@/api/queryKeys";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import TechniqueRecommendDialog from "./TechniqueRecommendDialog";

interface WritingTechniquePanelProps {
  styleProfileId: string | null;
  profileName?: string;
  profileDescription?: string | null;
}

export default function WritingTechniquePanel({
  styleProfileId,
  profileName,
  profileDescription,
}: WritingTechniquePanelProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<WritingTechniqueRecommendation[]>([]);

  const techniquesQuery = useQuery({
    queryKey: queryKeys.styleEngine.writingTechniques,
    queryFn: () => getWritingTechniques(),
  });

  const bindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.profileTechniqueBindings(styleProfileId ?? ""),
    queryFn: () => getProfileTechniqueBindings(styleProfileId!),
    enabled: !!styleProfileId,
  });

  const techniques = techniquesQuery.data?.techniques ?? [];
  const boundKeys = useMemo(
    () => new Set<string>((bindingsQuery.data ?? []).map((b: any) => (b.technique?.key ?? b.writingTechniqueId) as string)),
    [bindingsQuery.data],
  );

  const setBindingsMutation = useMutation({
    mutationFn: (keys: string[]) => setProfileTechniqueBindings(styleProfileId!, keys),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.styleEngine.profileTechniqueBindings(styleProfileId ?? ""),
      });
      toast("已更新写法技法绑定");
    },
  });

  const recommendMutation = useMutation({
    mutationFn: () =>
      recommendTechniquesForProfile(
        styleProfileId!,
        profileName ?? "",
        profileDescription ?? undefined,
      ),
    onSuccess: (data) => {
      if (data.length === 0) {
        toast("没有可推荐的技法，请确认技法库不为空。");
        return;
      }
      setRecommendations(data);
      setRecommendDialogOpen(true);
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : "AI 推荐失败，请重试。");
    },
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return techniques;
    const q = searchQuery.trim().toLowerCase();
    return techniques.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [techniques, searchQuery]);

  const handleToggle = (key: string, enabled: boolean) => {
    const current = new Set(boundKeys);
    if (enabled) current.add(key);
    else current.delete(key);
    setBindingsMutation.mutate(Array.from(current));
  };

  const handleRecommendConfirm = (selectedKeys: string[]) => {
    // 合并推荐选中的与当前已绑定的
    const merged = new Set(boundKeys);
    for (const key of selectedKeys) merged.add(key);
    setRecommendDialogOpen(false);
    setBindingsMutation.mutate(Array.from(merged));
  };

  if (!styleProfileId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5" />
            文笔技法
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">请先选择一个写法画像。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            文笔技法
          </span>
          <div className="flex items-center gap-2">
            <AiButton
              variant="outline"
              size="sm"
              onClick={() => recommendMutation.mutate()}
              disabled={recommendMutation.isPending}
            >
              {recommendMutation.isPending ? "AI 正在推荐..." : "AI帮我挑"}
            </AiButton>
            <Badge variant="secondary">{boundKeys.size} 条绑定</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            placeholder="搜索技法..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 300 }}>
          {filtered.map((t) => (
            <div
              key={t.key}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <Switch
                checked={boundKeys.has(t.key)}
                onCheckedChange={(checked) => handleToggle(t.key, checked)}
                disabled={setBindingsMutation.isPending}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{t.name}</span>
                {t.category && (
                  <Badge variant="outline" className="ml-1.5 text-[10px]">
                    {t.category}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" variant="secondary" asChild>
          <Link to="/writing-techniques">进入文笔资料库</Link>
        </Button>
      </CardContent>

      <TechniqueRecommendDialog
        open={recommendDialogOpen}
        onOpenChange={setRecommendDialogOpen}
        recommendations={recommendations}
        currentBoundKeys={boundKeys}
        onConfirm={handleRecommendConfirm}
        isConfirming={setBindingsMutation.isPending}
      />
    </Card>
  );
}
