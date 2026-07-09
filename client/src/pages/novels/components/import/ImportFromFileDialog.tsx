import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface ImportFromFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (novelId: string) => void;
}

interface ImportPreview {
  novelTitle: string;
  exportedAt: string;
  sectionKeys: string[];
  chapterCount: number;
  characterCount: number;
}

type ImportStage = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export default function ImportFromFileDialog({ open, onOpenChange, onImported }: ImportFromFileDialogProps) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<ImportStage>("idle");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rawBundle, setRawBundle] = useState<Record<string, unknown> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!rawBundle) throw new Error("未选择文件");
      const { data } = await apiClient.post("/novels/import", {
        bundle: rawBundle,
        scopes: Array.from(selectedScopes),
      });
      return data as { success: boolean; data?: { novelId: string } };
    },
    onSuccess: async (response) => {
      const novelId = response?.data?.novelId;
      setStage("done");
      await queryClient.invalidateQueries({ queryKey: ["novels"] });
      toast.success("导入成功");
      if (novelId) onImported?.(novelId);
    },
    onError: (error) => {
      setStage("error");
      setErrorMessage(error instanceof Error ? error.message : "导入失败");
      toast.error("导入失败");
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setStage("parsing");
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json?.metadata?.novelTitle || !json?.sections) {
          throw new Error("文件格式不符合导出规范。");
        }
        const sections = json.sections as Record<string, unknown>;
        const sectionKeys = Object.keys(sections).filter((k) => sections[k] != null);
        const chapterSection = sections.chapter as { chapters?: unknown[] } | undefined;
        const characterSection = sections.character as { characters?: unknown[] } | undefined;
        setRawBundle(json);
        setPreview({
          novelTitle: json.metadata.novelTitle,
          exportedAt: json.metadata.exportedAt ?? "未知",
          sectionKeys,
          chapterCount: chapterSection?.chapters?.length ?? 0,
          characterCount: characterSection?.characters?.length ?? 0,
        });
        setSelectedScopes(new Set(sectionKeys));
        setStage("preview");
      } catch (err) {
        setStage("error");
        setErrorMessage(err instanceof Error ? err.message : "文件解析失败");
      }
    };
    reader.onerror = () => {
      setStage("error");
      setErrorMessage("文件读取失败");
    };
    reader.readAsText(file);
  }, []);

  const toggleScope = (key: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reset = () => {
    setStage("idle");
    setPreview(null);
    setRawBundle(null);
    setErrorMessage("");
    setSelectedScopes(new Set());
  };

  if (!open) return null;

  const SCOPE_LABELS: Record<string, string> = {
    basic: "项目设定",
    story_macro: "故事宏观规划",
    character: "角色阵容",
    outline: "卷战略 / 卷骨架",
    structured: "节奏 / 拆章",
    chapter: "章节正文",
    pipeline: "质量修复数据",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-lg">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">从导出文件导入</h2>
        </div>
        <div className="p-4">
          {stage === "idle" || stage === "parsing" ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="block w-full text-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  选择 .json 格式的导出文件
                </p>
              </div>
              {stage === "parsing" && <p className="text-sm text-muted-foreground">解析中...</p>}
            </div>
          ) : stage === "preview" && preview ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium">{preview.novelTitle}</div>
                <div className="text-xs text-muted-foreground">
                  导出于 {new Date(preview.exportedAt).toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {preview.chapterCount} 章 · {preview.characterCount} 角色
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium">选择要导入的内容</div>
                <div className="space-y-1">
                  {preview.sectionKeys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedScopes.has(key)}
                        onChange={() => toggleScope(key)}
                      />
                      {SCOPE_LABELS[key] ?? key}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : stage === "done" ? (
            <div className="py-8 text-center">
              <p className="text-sm text-green-600">导入完成</p>
            </div>
          ) : stage === "error" ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          {stage === "preview" ? (
            <>
              <Button variant="ghost" onClick={reset}>重新选择</Button>
              <Button
                onClick={() => {
                  setStage("importing");
                  importMutation.mutate();
                }}
                disabled={selectedScopes.size === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? "导入中..." : "确认导入"}
              </Button>
            </>
          ) : stage === "error" ? (
            <Button variant="ghost" onClick={reset}>重试</Button>
          ) : null}
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
            {stage === "done" ? "完成" : "取消"}
          </Button>
        </div>
      </div>
    </div>
  );
}
