import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { queryKeys } from "@/api/queryKeys";
import {
  getMaterialList,
  getMaterialDetail,
  updateMaterial,
  deleteMaterial,
  toggleMaterial,
  importMaterials,
  type MaterialItem,
  type MaterialFullItem,
  type MaterialImportInput,
} from "@/api/novel/materials";

interface MaterialManagePanelProps {
  novelId: string;
  onImportClick?: () => void;
}

export default function MaterialManagePanel({ novelId, onImportClick }: MaterialManagePanelProps) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.novels.materials(novelId),
    queryFn: () => getMaterialList(novelId),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.novels.materialDetail(novelId, expandedId ?? ""),
    queryFn: () => getMaterialDetail(novelId, expandedId ?? ""),
    enabled: !!expandedId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; title?: string; description?: string | null }) =>
      updateMaterial(novelId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.materials(novelId) });
      toast.success("材料已更新。");
      setEditingId(null);
    },
    onError: (err: Error) => toast.error(`更新失败：${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterial(novelId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.materials(novelId) });
      toast.success("材料已删除。");
      if (expandedId) setExpandedId(null);
    },
    onError: (err: Error) => toast.error(`删除失败：${err.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleMaterial(novelId, id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.materials(novelId) });
    },
    onError: (err: Error) => toast.error(`操作失败：${err.message}`),
  });

  const materials = listQuery.data?.data?.items ?? [];

  function startEdit(item: MaterialItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, title: editTitle.trim() || undefined, description: editDescription.trim() || null });
  }

  function handleToggle(item: MaterialItem) {
    toggleMutation.mutate({ id: item.id, enabled: !item.enabled });
  }

  function handleDelete(id: string, title: string) {
    if (confirm(`确定删除材料「${title}」吗？此操作不可撤销。`)) {
      deleteMutation.mutate(id);
    }
  }

  if (listQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">加载参考材料列表...</div>;
  }

  if (listQuery.isError) {
    return <div className="py-8 text-center text-sm text-destructive">加载失败，请稍后重试。</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">参考材料</h3>
          <p className="text-xs text-muted-foreground">管理导入的小说参考材料，启用后会出现在 AI 写作上下文中。</p>
        </div>
        <Button variant="outline" size="sm" onClick={onImportClick}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          导入材料
        </Button>
      </div>

      {/* Material list */}
      {materials.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          暂无参考材料。点击"导入材料"将你的创作素材导入系统。
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border transition-colors ${item.enabled ? "bg-card" : "bg-muted/30 opacity-60"}`}
            >
              {/* Item header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  {editingId === item.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring"
                        placeholder="材料标题"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:border-ring resize-none"
                        placeholder="材料描述（可选）"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEdit}>取消</Button>
                        <Button size="sm" onClick={() => saveEdit(item.id)} disabled={!editTitle.trim()}>保存</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.wordCount.toLocaleString()} 字
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  )}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      item.enabled
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => handleToggle(item)}
                    title={item.enabled ? "已启用，点击禁用" : "已禁用，点击启用"}
                  >
                    {item.enabled ? "启用" : "禁用"}
                  </button>
                  {editingId !== item.id && (
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => startEdit(item)}
                      title="编辑"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted"
                    onClick={() => handleDelete(item.id, item.title)}
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === item.id && (
                <div className="border-t px-4 py-3">
                  {detailQuery.isLoading ? (
                    <div className="text-xs text-muted-foreground">加载全文...</div>
                  ) : detailQuery.isError ? (
                    <div className="text-xs text-destructive">加载失败</div>
                  ) : detailQuery.data?.data ? (
                    <div className="max-h-[300px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/80 leading-relaxed">
                        {detailQuery.data.data.content.slice(0, 5000)}
                        {detailQuery.data.data.content.length > 5000 && (
                          <span className="text-muted-foreground">\n\n...（内容过长，仅显示前 5000 字）</span>
                        )}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
