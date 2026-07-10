import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { getNovelList } from "@/api/novel/core";
import {
  adoptSlots,
  deleteSlotOverride,
  getSlotOverrides,
  getSlotReconcile,
  keepMySlots,
  saveSlotOverride,
  type PromptCatalogItem,
  type PromptSlotOverrideEntry,
  type PromptSlotOverrideView,
  type PromptSlotReconcileItem,
  type PromptSlotReconcileResult,
} from "@/api/promptWorkbench";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SLOT_KIND_LABELS, buildOverrideParamsKey, buildReconcileParamsKey } from "./promptSlotPanel.utils";
import { SlotRow, ReconcileBanner } from "./PromptSlotControls";

// ─── Main panel ───────────────────────────────────────────────────────────────

type ScopeTab = "global" | "novel";

export function PromptSlotPanel({ prompt }: { prompt: PromptCatalogItem }) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ScopeTab>("global");
  const [selectedNovelId, setSelectedNovelId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string | boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showReconcile, setShowReconcile] = useState(false);
  const prevPromptId = useRef(prompt.id);

  // Reset drafts when prompt changes
  useEffect(() => {
    if (prevPromptId.current !== prompt.id) {
      prevPromptId.current = prompt.id;
      setDrafts({});
      setSaveError(null);
      setShowReconcile(false);
    }
  }, [prompt.id]);

  const activeNovelId = scope === "novel" ? selectedNovelId : "";

  const overrideParamsKey = useMemo(
    () => buildOverrideParamsKey(prompt.id, activeNovelId),
    [prompt.id, activeNovelId],
  );

  const reconcileParamsKey = useMemo(
    () => buildReconcileParamsKey(prompt.id, scope, activeNovelId),
    [prompt.id, scope, activeNovelId],
  );

  const novelsQuery = useQuery({
    queryKey: queryKeys.novels.list(1, 50),
    queryFn: () => getNovelList({ page: 1, limit: 50 }),
    staleTime: 60_000,
  });

  const overrideQuery = useQuery({
    queryKey: queryKeys.promptWorkbench.slotOverrides(overrideParamsKey),
    queryFn: () => getSlotOverrides({ promptId: prompt.id, novelId: activeNovelId || undefined }),
    enabled: prompt.slotSupported,
    staleTime: 15_000,
  });

  const reconcileQuery = useQuery({
    queryKey: queryKeys.promptWorkbench.slotReconcile(reconcileParamsKey),
    queryFn: () => getSlotReconcile({
      promptId: prompt.id,
      scope,
      novelId: activeNovelId || undefined,
    }),
    enabled: prompt.slotSupported && showReconcile,
    staleTime: 30_000,
  });

  const overrides: PromptSlotOverrideView[] = overrideQuery.data?.data ?? [];
  const scopeOverride = overrides.find((row) => {
    if (scope === "global") return row.scope === "global";
    return row.scope === "novel" && row.novelId === activeNovelId;
  });
  const slotMap: Record<string, PromptSlotOverrideEntry> = scopeOverride?.slots ?? {};

  const reconcile: PromptSlotReconcileResult | null = reconcileQuery.data?.data ?? null;
  const reconcileMap: Record<string, PromptSlotReconcileItem> = useMemo(() => {
    if (!reconcile) return {};
    return Object.fromEntries(reconcile.items.map((item) => [item.key, item]));
  }, [reconcile]);

  const hasDrift = reconcile?.hasDrift ?? false;
  const driftCount = (reconcile?.driftedCount ?? 0) + (reconcile?.newCount ?? 0) + (reconcile?.orphanedCount ?? 0);

  const invalidateOverride = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.promptWorkbench.slotOverrides(overrideParamsKey) });
  };
  const invalidateReconcile = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.promptWorkbench.slotReconcile(reconcileParamsKey) });
  };

  const saveMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      saveSlotOverride({
        scope,
        novelId: scope === "novel" ? activeNovelId : null,
        promptId: prompt.id,
        slotUpdates: updates,
      }),
    onSuccess: () => {
      setSaveError(null);
      setDrafts({});
      invalidateOverride();
      invalidateReconcile();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "保存失败，请重试。";
      setSaveError(message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: (slotKeys: string[]) =>
      deleteSlotOverride({
        scope,
        novelId: scope === "novel" ? activeNovelId : null,
        promptId: prompt.id,
        slotKeys,
      }),
    onSuccess: () => {
      invalidateOverride();
      invalidateReconcile();
    },
  });

  const adoptMutation = useMutation({
    mutationFn: (slotKeys: string[]) =>
      adoptSlots({
        promptId: prompt.id,
        scope,
        novelId: scope === "novel" ? activeNovelId : null,
        slotKeys,
      }),
    onSuccess: () => {
      invalidateOverride();
      invalidateReconcile();
    },
  });

  const keepMutation = useMutation({
    mutationFn: (slotKeys: string[]) =>
      keepMySlots({
        promptId: prompt.id,
        scope,
        novelId: scope === "novel" ? activeNovelId : null,
        slotKeys,
      }),
    onSuccess: () => {
      invalidateReconcile();
    },
  });

  const reconcilePending = adoptMutation.isPending || keepMutation.isPending;
  const novels = novelsQuery.data?.data?.items ?? [];
  const slotDefs = prompt.slots ?? [];
  const hasDirtyDrafts = Object.keys(drafts).length > 0;

  function handleDraftChange(key: string, value: string | boolean) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setSaveError(null);
  }

  function handleResetToDefault(key: string) {
    // Remove draft for this key; if there's a saved override, delete it
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (slotMap[key] !== undefined) {
      resetMutation.mutate([key]);
    }
  }

  function handleSave() {
    if (!hasDirtyDrafts) return;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(drafts)) {
      updates[key] = value;
    }
    saveMutation.mutate(updates);
  }

  function handleAdoptAll() {
    if (!reconcile) return;
    const keys = reconcile.items
      .filter((item) => item.state === "drifted" || item.state === "orphaned")
      .map((item) => item.key);
    if (keys.length > 0) adoptMutation.mutate(keys);
  }

  function handleKeepAll() {
    if (!reconcile) return;
    const keys = reconcile.items
      .filter((item) => item.state === "drifted")
      .map((item) => item.key);
    if (keys.length > 0) keepMutation.mutate(keys);
  }

  if (!prompt.slotSupported) {
    return (
      <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
        这个提示词暂未声明可编辑槽位，尚不支持细节定制。
      </div>
    );
  }

  const isNovelScopeDisabled = scope === "novel" && !activeNovelId;

  return (
    <div className="space-y-4">
      {/* Scope banner */}
      <div className="rounded-md border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          生效优先级
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          出厂默认值 → 全局覆盖 → 本书覆盖（本书优先）。修改后即时预览，保存后下次真实生成时生效。
        </p>
      </div>

      {/* Scope tabs + novel picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-md border bg-muted/40 p-0.5">
          {(["global", "novel"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setScope(tab); setDrafts({}); setSaveError(null); }}
              className={cn(
                "rounded px-4 py-1.5 text-sm font-medium transition-colors",
                scope === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "global" ? "全局" : "本书"}
            </button>
          ))}
        </div>

        {scope === "novel" && (
          <select
            value={selectedNovelId}
            onChange={(e) => { setSelectedNovelId(e.target.value); setDrafts({}); setSaveError(null); }}
            className="h-9 min-w-52 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">选择小说</option>
            {novels.map((novel) => (
              <option key={novel.id} value={novel.id}>
                {novel.title || novel.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Reconcile toggle */}
      {scope !== "novel" || activeNovelId ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowReconcile((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {showReconcile ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showReconcile ? "隐藏更新检测" : "检测是否有出厂文案更新"}
            {hasDrift && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                ⟳ {driftCount}
              </span>
            )}
          </button>
          {showReconcile && (
            <button
              type="button"
              onClick={() => { invalidateReconcile(); reconcileQuery.refetch(); }}
              disabled={reconcileQuery.isFetching}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", reconcileQuery.isFetching && "animate-spin")} />
            </button>
          )}
        </div>
      ) : null}

      {/* Reconcile banner */}
      {showReconcile && reconcile && (
        <ReconcileBanner
          reconcile={reconcile}
          onAdoptAll={handleAdoptAll}
          onKeepAll={handleKeepAll}
          pending={reconcilePending}
        />
      )}

      {/* Novel scope disabled hint */}
      {isNovelScopeDisabled && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          选择小说后可设置本书独立的槽位覆盖。
        </div>
      )}

      {/* Slot list */}
      {!isNovelScopeDisabled && (
        <div className="space-y-3">
          {overrideQuery.isLoading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">加载覆盖记录中...</div>
          ) : (
            slotDefs.map((def) => (
              <SlotRow
                key={def.key}
                def={def}
                overrideEntry={slotMap[def.key]}
                reconcileItem={reconcileMap[def.key]}
                draftValue={drafts[def.key]}
                disabled={saveMutation.isPending || resetMutation.isPending}
                onDraftChange={handleDraftChange}
                onResetToDefault={handleResetToDefault}
                onAdopt={(key) => adoptMutation.mutate([key])}
                onKeep={(key) => keepMutation.mutate([key])}
                reconcilePending={reconcilePending}
                slotKindLabels={SLOT_KIND_LABELS}
              />
            ))
          )}
        </div>
      )}

      {/* Save bar */}
      {!isNovelScopeDisabled && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {saveError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}
            {saveMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Sparkles className="h-4 w-4" />
                保存成功，下次生成时生效。
              </div>
            )}
            {!saveError && !saveMutation.isSuccess && hasDirtyDrafts && (
              <div className="text-xs text-muted-foreground">
                {Object.keys(drafts).length} 个槽位有未保存改动。
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasDirtyDrafts || saveMutation.isPending}
            className="shrink-0"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "保存中..." : "保存覆盖"}
          </Button>
        </div>
      )}
    </div>
  );
}
