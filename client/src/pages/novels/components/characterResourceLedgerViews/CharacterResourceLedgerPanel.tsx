import { useMemo, useState } from "react";
import type { Character, CharacterResourceLedgerItem } from "@ai-novel/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
import {
  createCharacterResource,
  deleteCharacterResource,
  updateCharacterResource,
} from "@/api/novel/characters";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import type { StatusBadgeVariant } from "@/components/ui/status-badge";
import ResourceLedgerEditDialog from "./ResourceLedgerEditDialog";
import ResourceLedgerStatusDialog from "./ResourceLedgerStatusDialog";
import {
  getResourceStatusLabel,
  getResourceFunctionLabel,
  getResourceTypeLabel,
  getRiskLevelVariant,
  getRiskLevelLabel,
  isBlockedStatus,
} from "./characterResourceLabels";

interface CharacterResourceLedgerPanelProps {
  novelId: string;
  items: CharacterResourceLedgerItem[];
  characters: Character[];
  onBackfill?: () => void;
  isBackfilling?: boolean;
  /** Optional: rendered as an extra toolbar action */
  toolbarExtra?: React.ReactNode;
  /** Optional: link to navigate to character detail; called with characterId */
  onNavigateToCharacter?: (characterId: string) => void;
}

export default function CharacterResourceLedgerPanel(props: CharacterResourceLedgerPanelProps) {
  const { novelId, items, characters, onBackfill, isBackfilling = false, toolbarExtra, onNavigateToCharacter } = props;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCharacterId, setFilterCharacterId] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("");
  const [editResource, setEditResource] = useState<CharacterResourceLedgerItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusResource, setStatusResource] = useState<CharacterResourceLedgerItem | null>(null);

  const invalidateResources = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterResources(novelId) });
  };

  const deleteMutation = useMutation({
    mutationFn: (resourceId: string) => deleteCharacterResource(novelId, resourceId),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.novels.characterResources(novelId), data);
      await invalidateResources();
      toast.success("资源已删除。");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "删除资源失败。");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createCharacterResource>[1]) => createCharacterResource(novelId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.novels.characterResources(novelId), data);
      await invalidateResources();
      toast.success("资源已创建。");
      setCreateOpen(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "创建资源失败。");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ resourceId, payload }: { resourceId: string; payload: Parameters<typeof updateCharacterResource>[2] }) =>
      updateCharacterResource(novelId, resourceId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.novels.characterResources(novelId), data);
      await invalidateResources();
      toast.success("资源已更新。");
      setEditResource(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "更新资源失败。");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ resourceId, newStatus }: { resourceId: string; newStatus: CharacterResourceLedgerItem["status"] }) => {
      const item = items.find((r) => r.id === resourceId);
      if (!item) { throw new Error("找不到该资源。"); }
      return updateCharacterResource(novelId, resourceId, { status: newStatus, name: item.name });
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.novels.characterResources(novelId), data);
      await invalidateResources();
      toast.success("状态已更新。");
      setStatusResource(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "更新状态失败。");
    },
  });

  const characterOptions = useMemo(
    () => characters.map((c) => ({ id: c.id, name: c.name })),
    [characters],
  );

  const riskOptions = useMemo(
    () => [
      { value: "", label: "全部风险" },
      { value: "error", label: "高风险" },
      { value: "warning", label: "中风险" },
      { value: "info", label: "低风险" },
      { value: "success", label: "无风险" },
    ],
    [],
  );

  const filteredItems = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.resourceKey.toLowerCase().includes(q),
      );
    }
    if (filterCharacterId) {
      result = result.filter(
        (item) =>
          item.holderCharacterId === filterCharacterId ||
          item.ownerCharacterId === filterCharacterId,
      );
    }
    if (filterRisk) {
      result = result.filter((item) => getRiskLevelVariant(item.riskSignals) === filterRisk);
    }
    return result;
  }, [items, search, filterCharacterId, filterRisk]);

  const getCharacterName = (characterId: string | null | undefined): string => {
    if (!characterId) return "-";
    const c = characters.find((ch) => ch.id === characterId);
    return c?.name ?? characterId.slice(0, 8);
  };

  const openDelay = statusMutation.isPending ? 400 : 0;

  const handleStatusChange = (resourceId: string, newStatus: CharacterResourceLedgerItem["status"]) => {
    statusMutation.mutate({ resourceId, newStatus });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="搜索资源名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={filterCharacterId}
            onChange={(e) => setFilterCharacterId(e.target.value)}
          >
            <option value="">全部角色</option>
            {characterOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
          >
            {riskOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbarExtra}
          {onBackfill ? (
            <Button size="sm" variant="outline" onClick={onBackfill} disabled={isBackfilling}>
              {isBackfilling ? "回填中..." : "回填最近章节"}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增资源
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">共 {items.length} 条</Badge>
        {filteredItems.length !== items.length ? (
          <Badge variant="secondary">筛选后 {filteredItems.length} 条</Badge>
        ) : null}
        <Badge variant="outline">
          阻塞 {items.filter((r) => isBlockedStatus(r.status)).length} 条
        </Badge>
        <Badge variant="outline">
          高风险 {items.filter((r) => getRiskLevelVariant(r.riskSignals) === "error").length} 条
        </Badge>
      </div>

      {/* Resource list */}
      {filteredItems.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "暂无资源条目，可点击「新增资源」手动添加或「回填最近章节」自动提取。"
            : "没有匹配的资源，请调整筛选条件。"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">名称</th>
                <th className="px-3 py-2 font-medium">类型</th>
                <th className="px-3 py-2 font-medium">功能</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">持有者</th>
                <th className="px-3 py-2 font-medium">拥有者</th>
                <th className="px-3 py-2 font-medium">风险</th>
                <th className="px-3 py-2 font-medium w-[100px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const blocked = isBlockedStatus(item.status);
                const riskVariant = getRiskLevelVariant(item.riskSignals);
                const riskLabel = getRiskLevelLabel(item.riskSignals);
                return (
                  <tr
                    key={item.id}
                    className={`border-b transition-colors hover:bg-muted/20 ${
                      blocked ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <td className="max-w-[180px] truncate px-3 py-2">
                      <span className="font-medium">{item.name}</span>
                      {blocked ? (
                        <span className="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          阻塞
                        </span>
                      ) : null}
                      {item.summary ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.summary}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{getResourceTypeLabel(item.resourceType)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{getResourceFunctionLabel(item.narrativeFunction)}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={item.status === "available" || item.status === "borrowed" ? "default" : "outline"}>
                        {getResourceStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {item.holderCharacterId ? (
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => onNavigateToCharacter?.(item.holderCharacterId!)}
                        >
                          {item.holderCharacterName || getCharacterName(item.holderCharacterId)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {item.ownerCharacterId ? (
                        <button
                          type="button"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={() => onNavigateToCharacter?.(item.ownerCharacterId!)}
                        >
                          {item.ownerName || getCharacterName(item.ownerCharacterId)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{item.ownerName || "-"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={riskVariant as StatusBadgeVariant}>{riskLabel}</StatusBadge>
                      {blocked && item.lastTouchedChapterOrder != null ? (
                        <div className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          影响章节：第{item.lastTouchedChapterOrder}章
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditResource(item);
                            // Delay so state settles; avoids race with status dialog
                            setTimeout(() => setEditResource(item), 0);
                          }}
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setStatusResource(item)}
                          title="状态流转"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(`确认删除「${item.name}」？此操作不可撤销。`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <ResourceLedgerEditDialog
        novelId={novelId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        characters={characters}
        mode="create"
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Dialog */}
      <ResourceLedgerEditDialog
        novelId={novelId}
        open={!!editResource}
        onOpenChange={(open) => {
          if (!open) setEditResource(null);
        }}
        characters={characters}
        mode="edit"
        resource={editResource}
        onSubmit={(payload) => {
          if (editResource) {
            updateMutation.mutate({ resourceId: editResource.id, payload });
          }
        }}
        isSubmitting={updateMutation.isPending}
        openDelay={openDelay}
      />

      {/* Status Transition Dialog */}
      <ResourceLedgerStatusDialog
        open={!!statusResource}
        onOpenChange={(open) => {
          if (!open) setStatusResource(null);
        }}
        resource={statusResource}
        currentStatus={statusResource?.status ?? "available"}
        onChangeStatus={handleStatusChange}
        isSubmitting={statusMutation.isPending}
      />
    </div>
  );
}
