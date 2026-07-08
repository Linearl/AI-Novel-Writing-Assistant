import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { parseMaterial, type MaterialParseResult } from "@/api/novel/materialParse";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface MaterialParseDialogProps {
  onApplyParsed: (patch: Partial<NovelBasicFormState>) => void;
}

interface FieldPreviewRow {
  key: keyof MaterialParseResult;
  label: string;
  value: string;
}

const FIELD_LABELS: Record<keyof MaterialParseResult, string> = {
  title: "小说标题",
  description: "一句话概述",
  targetAudience: "目标读者",
  bookSellingPoint: "核心卖点",
  competingFeel: "竞品阅读感",
  first30ChapterPromise: "前 30 章承诺",
  styleTone: "风格关键词",
  commercialTagsText: "商业标签",
  worldSetting: "世界观设定",
  characters: "角色信息",
  outline: "大纲信息",
  genreHint: "题材倾向",
};

function mapParsedToFormPatch(parsed: MaterialParseResult): Partial<NovelBasicFormState> {
  const patch: Partial<NovelBasicFormState> = {};
  if (parsed.title) patch.title = parsed.title;
  if (parsed.description) patch.description = parsed.description;
  if (parsed.targetAudience) patch.targetAudience = parsed.targetAudience;
  if (parsed.bookSellingPoint) patch.bookSellingPoint = parsed.bookSellingPoint;
  if (parsed.competingFeel) patch.competingFeel = parsed.competingFeel;
  if (parsed.first30ChapterPromise) patch.first30ChapterPromise = parsed.first30ChapterPromise;
  if (parsed.styleTone) patch.styleTone = parsed.styleTone;
  if (parsed.commercialTagsText) patch.commercialTagsText = parsed.commercialTagsText;
  return patch;
}

function buildPreviewRows(parsed: MaterialParseResult): FieldPreviewRow[] {
  const rows: FieldPreviewRow[] = [];
  for (const [key, label] of Object.entries(FIELD_LABELS) as Array<[keyof MaterialParseResult, string]>) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim().length > 0) {
      rows.push({ key, label, value: value.trim() });
    }
  }
  return rows;
}

export default function MaterialParseDialog({ onApplyParsed }: MaterialParseDialogProps) {
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<FieldPreviewRow[]>([]);
  const llm = useLLMStore();

  const parseMutation = useMutation({
    mutationFn: () => parseMaterial({
      material,
      provider: llm.provider,
      model: llm.model,
    }),
    onSuccess: (response) => {
      const parsed = response.data;
      if (!parsed) {
        toast.error("素材解析返回为空，请检查输入内容。");
        return;
      }
      const rows = buildPreviewRows(parsed);
      if (rows.length === 0) {
        toast.error("未能从素材中识别出有效信息，请检查输入内容。");
        return;
      }
      const editableMap: Record<string, string> = {};
      for (const row of rows) {
        editableMap[row.key] = row.value;
      }
      setPreviewRows(rows);
      setEditValues(editableMap);
      toast.success(`成功识别 ${rows.length} 个字段，请确认后填入。`);
    },
    onError: (error: Error) => {
      toast.error(`素材解析失败：${error.message}`);
    },
  });

  function handleConfirm() {
    const patch: Partial<NovelBasicFormState> = {};
    for (const row of previewRows) {
      const edited = editValues[row.key];
      if (edited !== undefined && edited.trim().length > 0) {
        (patch as Record<string, string>)[row.key] = edited.trim();
      }
    }
    onApplyParsed(patch);
    setOpen(false);
    resetState();
    toast.success("素材已填入表单。");
  }

  function resetState() {
    setMaterial("");
    setPreviewRows([]);
    setEditValues({});
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
      parseMutation.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          粘贴素材
        </Button>
      </DialogTrigger>

      <AppDialogContent
        title="粘贴创作素材"
        description="粘贴已有的世界观、角色、大纲、灵感等素材，AI 会自动识别内容类型并拆分到对应字段。"
        className="max-w-3xl"
        footer={(
          <>
            {previewRows.length > 0 ? (
              <>
                <Button variant="outline" onClick={() => { setPreviewRows([]); setEditValues({}); }}>
                  重新粘贴
                </Button>
                <Button onClick={handleConfirm} disabled={parseMutation.isPending}>
                  确认填入
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => parseMutation.mutate()}
                  disabled={material.trim().length < 10 || parseMutation.isPending}
                >
                  {parseMutation.isPending ? "解析中..." : "AI 解析"}
                </Button>
              </>
            )}
          </>
        )}
      >
        {previewRows.length === 0 ? (
          <div className="space-y-3">
            <textarea
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder={"在此粘贴你的创作素材，例如：\n\n- 世界观设定\n- 角色小传\n- 故事大纲\n- 灵感笔记\n- 任意格式的创作文档\n\nAI 会自动识别内容类型并拆分到对应的表单字段。"}
              className="h-[400px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={parseMutation.isPending}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                已输入 {material.length.toLocaleString()} 字
                {material.length >= 50000 ? "（已达上限）" : ""}
              </span>
              <span>支持任意格式，建议至少 50 字以获得更好的识别效果</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              AI 从素材中识别到以下字段，你可以编辑后确认填入。未识别到的字段不会覆盖已有内容。
            </div>
            <div className="space-y-3">
              {previewRows.map((row) => (
                <div key={row.key} className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    {row.label}
                  </label>
                  {row.key === "worldSetting" || row.key === "characters" || row.key === "outline" ? (
                    <textarea
                      value={editValues[row.key] ?? row.value}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      rows={4}
                      className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editValues[row.key] ?? row.value}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
