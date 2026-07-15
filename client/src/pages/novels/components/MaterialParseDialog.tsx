import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { parseMaterial, type MaterialParseResult, type MaterialFileInput } from "@/api/novel/materialParse";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AppDialogContent,
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface MaterialParseDialogProps {
  onApplyParsed: (patch: Partial<NovelBasicFormState>) => void;
  onMaterialsParsed?: (materials: MaterialFileInput[], storyInput?: string) => void;
}

interface FieldPreviewRow {
  key: keyof MaterialParseResult;
  label: string;
  value: string;
}

interface UploadedFile {
  title: string;
  content: string;
  wordCount: number;
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
  chapterCountHint: "预计章节数",
  storyInput: "故事输入摘要",
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
    } else if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      rows.push({ key, label, value: String(value) });
    }
  }
  return rows;
}

export default function MaterialParseDialog({ onApplyParsed, onMaterialsParsed }: MaterialParseDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<FieldPreviewRow[]>([]);
  const llm = useLLMStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = useMutation({
    mutationFn: () => {
      const materials: MaterialFileInput[] = uploadedFiles.map((f) => ({
        title: f.title,
        content: f.content,
      }));
      return parseMaterial({
        materials,
        provider: llm.provider,
        model: llm.model,
      });
    },
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

      if (onMaterialsParsed && parsed.storyInput) {
        onMaterialsParsed(
          uploadedFiles.map((f) => ({ title: f.title, content: f.content })),
          parsed.storyInput,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`素材解析失败：${error.message}`);
    },
  });

  function handleConfirm() {
    const patch: Record<string, unknown> = {};
    for (const row of previewRows) {
      const edited = editValues[row.key];
      if (edited !== undefined && edited.trim().length > 0) {
        if (row.key === "chapterCountHint") {
          const num = Number.parseInt(edited.trim(), 10);
          if (Number.isFinite(num) && num > 0) {
            patch.estimatedChapterCount = num;
          }
        } else if (row.key === "storyInput") {
          // storyInput is not part of form state, handled via onMaterialsParsed
        } else {
          patch[row.key] = edited.trim();
        }
      }
    }
    onApplyParsed(patch as Partial<NovelBasicFormState>);
    setOpen(false);
    resetState();
    toast.success("素材已填入表单。");
  }

  function resetState() {
    setUploadedFiles([]);
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

  function processFiles(fileList: FileList) {
    const files = Array.from(fileList).filter(
      (f) => f.name.endsWith(".txt") || f.name.endsWith(".md") || f.name.endsWith(".text"),
    );
    if (files.length === 0) {
      toast.error("未找到支持的文件（.txt / .md / .text），请重新选择。");
      return;
    }

    const readers: Promise<UploadedFile>[] = files.map((file) => {
      return new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === "string") {
            const displayTitle = file.name.replace(/\.(txt|md|text)$/i, "");
            resolve({
              title: displayTitle,
              content: text,
              wordCount: text.length,
            });
          } else {
            reject(new Error(`无法读取 ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
        reader.readAsText(file, "utf-8");
      });
    });

    Promise.all(readers)
      .then((results) => {
        setUploadedFiles((prev) => [...prev, ...results]);
        toast.success(`已导入 ${results.length} 个文件（共 ${results.reduce((sum, f) => sum + f.wordCount, 0).toLocaleString()} 字）`);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "文件读取失败"));
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    event.target.value = "";
  }

  function handleFolderImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    event.target.value = "";
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFileTitle(index: number, newTitle: string) {
    setUploadedFiles((prev) => prev.map((f, i) => (i === index ? { ...f, title: newTitle } : f)));
  }

  function moveFileUp(index: number) {
    if (index === 0) return;
    setUploadedFiles((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function moveFileDown(index: number) {
    if (index >= uploadedFiles.length - 1) return;
    setUploadedFiles((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  }

  const totalChars = uploadedFiles.reduce((sum, f) => sum + f.wordCount, 0);
  const canParse = uploadedFiles.length > 0 && !parseMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          导入素材
        </Button>
      </DialogTrigger>

      <AppDialogContent
        title="导入创作素材"
        description="导入已有的世界观文档、角色设定、大纲等素材文件，AI 会自动识别内容类型并拆分到对应字段。支持 .txt / .md 格式。"
        className="max-w-3xl"
        footer={(
          <>
            {previewRows.length > 0 ? (
              <>
                <Button variant="outline" onClick={() => { setPreviewRows([]); setEditValues({}); }}>
                  重新解析
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
                  disabled={!canParse}
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
            {/* File import area */}
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                选择包含创作素材的 .txt / .md 文件或文件夹
              </div>

              <div className="flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.text"
                  multiple
                  className="hidden"
                  onChange={handleFileImport}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parseMutation.isPending}
                >
                  选择文件
                </Button>

                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is not in types
                  webkitdirectory=""
                  multiple
                  className="hidden"
                  onChange={handleFolderImport}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={parseMutation.isPending}
                >
                  选择文件夹
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                支持同时选择多个文件或整个文件夹，仅处理 .txt / .md / .text 文件
              </div>
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">已导入 {uploadedFiles.length} 个文件</span>
                  <span className="text-xs text-muted-foreground">
                    共 {totalChars.toLocaleString()} 字
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-1.5 rounded-md border bg-muted/20 p-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={`${file.title}-${idx}`} className="flex items-center gap-2 rounded bg-background px-3 py-2 text-sm">
                      <input
                        type="text"
                        value={file.title}
                        onChange={(e) => updateFileTitle(idx, e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-primary px-1 py-0.5"
                        placeholder="素材标题"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {file.wordCount.toLocaleString()} 字
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveFileUp(idx)}
                          title="上移"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          disabled={idx === uploadedFiles.length - 1}
                          onClick={() => moveFileDown(idx)}
                          title="下移"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(idx)}
                          title="删除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  {row.key === "worldSetting" || row.key === "characters" || row.key === "outline" || row.key === "storyInput" ? (
                    <Textarea
                      value={editValues[row.key] ?? row.value}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      rows={4}
                      className="resize-y"
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
