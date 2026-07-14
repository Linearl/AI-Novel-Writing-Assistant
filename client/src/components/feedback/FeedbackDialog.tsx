import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, X, Image as ImageIcon, Sparkles, Copy, ExternalLink } from "lucide-react";
import { submitFeedback, uploadAttachment, generateIssue } from "@/api/feedback";
import type { GenerateIssueResponse } from "@/api/feedback";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  AppDialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { installFeedbackCollector, collectFeedbackContext } from "@/lib/feedbackContextCollector";

const SEVERITY_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "critical", label: "严重" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "功能建议" },
  { value: "improvement", label: "改进" },
  { value: "question", label: "问题咨询" },
  { value: "other", label: "其他" },
] as const;

const MAX_IMAGES = 5;
const GITHUB_ISSUES_URL = "https://github.com/issues/new";

type TabMode = "form" | "preview";

interface ImageEntry {
  name: string;
  base64: string;
  previewUrl: string;
}

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

export default function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>("form");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("other");
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [issueResult, setIssueResult] = useState<GenerateIssueResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Install feedback context collector on mount
  useEffect(() => {
    installFeedbackCollector();
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setCategory("other");
    setImages((prev) => {
      for (const img of prev) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return [];
    });
    setIssueResult(null);
    setTab("form");
  }, []);

  const handleClose = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }, [resetForm]);

  // Submit mutation (original flow - direct feedback)
  const submitMutation = useMutation({
    mutationFn: async () => {
      const result = await submitFeedback({
        title,
        description,
        severity,
        category,
      });
      const folderName = result.data?.folderName;
      if (folderName) {
        for (const img of images) {
          await uploadAttachment(folderName, img.name, img.base64);
        }
      }
      return result;
    },
    onSuccess: () => {
      toast.success("反馈已提交，感谢您的反馈！");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.list("") });
      handleClose(false);
    },
    onError: () => {
      toast.error("提交失败，请稍后重试");
    },
  });

  // Generate issue mutation (AI flow)
  const generateMutation = useMutation({
    mutationFn: async () => {
      const context = collectFeedbackContext();
      return generateIssue({
        description: description || title,
        context,
        images: images.map((img) => ({ fileName: img.name, base64: img.base64 })),
      });
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setIssueResult(data.data);
        setTab("preview");
      } else {
        toast.error(data.error || "生成失败");
      }
    },
    onError: () => {
      toast.error("生成失败，请稍后重试");
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const handleGenerateIssue = useCallback(() => {
    setIsGenerating(true);
    generateMutation.mutate();
  }, [generateMutation]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!issueResult) return;
    try {
      await navigator.clipboard.writeText(issueResult.markdown);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择复制");
    }
  }, [issueResult]);

  // Image handling
  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    const toProcess = fileArray.slice(0, remaining);

    for (const file of toProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const entry: ImageEntry = {
          name: file.name,
          base64: dataUrlToBase64(dataUrl),
          previewUrl: URL.createObjectURL(file),
        };
        setImages((prev) => [...prev, entry]);
      };
      reader.readAsDataURL(file);
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }, []);

  // Paste handler for Ctrl+V screenshots
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addImages(imageFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open, addImages]);

  const canSubmit = description.trim().length > 0 && !submitMutation.isPending;
  const canGenerate = description.trim().length > 0 && !isGenerating && !generateMutation.isPending;

  const footer = tab === "form" ? (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={handleGenerateIssue}
        disabled={!canGenerate}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? "生成中..." : "生成 Issue"}
      </Button>
      <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit}>
        {submitMutation.isPending ? "提交中..." : "提交反馈"}
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setTab("form")}>
        返回编辑
      </Button>
      <Button variant="outline" onClick={handleCopyToClipboard}>
        <Copy className="mr-2 h-4 w-4" />
        复制内容
      </Button>
      <Button onClick={() => window.open(GITHUB_ISSUES_URL, "_blank")}>
        <ExternalLink className="mr-2 h-4 w-4" />
        跳转 GitHub Issues
      </Button>
    </div>
  );

  return (
    <>
      {/* FAB Floating Button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        size="icon"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) addImages(e.target.files);
          e.target.value = "";
        }}
      />

      <Dialog open={open} onOpenChange={handleClose}>
        <AppDialogContent
          title={tab === "form" ? "提交反馈" : "Issue 预览"}
          description={tab === "form"
            ? "描述问题或建议，支持 Ctrl+V 粘贴截图。"
            : "AI 已生成 Issue 内容，确认后可复制或跳转到 GitHub。"
          }
          footer={footer}
          className="max-w-2xl"
        >
          {tab === "form" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">详细描述</label>
                <Textarea
                  className="min-h-[120px] rounded-xl"
                  placeholder="请详细描述您遇到的问题或建议... 支持 Ctrl+V 粘贴截图"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {description.length}/5000
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">严重程度</label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">分类</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image attachments */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  图片附件 ({images.length}/{MAX_IMAGES})
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_IMAGES}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  选择图片
                </Button>
                {images.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {images.map((img, index) => (
                      <div
                        key={`${img.name}-${index}`}
                        className="relative group rounded-lg border overflow-hidden aspect-square"
                      >
                        <img
                          src={img.previewUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <span className="text-[10px] text-white truncate block">
                            {img.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Preview tab */
            <div className="space-y-4">
              {issueResult && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">标题</label>
                    <div className="text-sm font-semibold p-3 bg-muted rounded-lg">
                      {issueResult.title}
                    </div>
                  </div>
                  {issueResult.labels.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">标签</label>
                      <div className="flex flex-wrap gap-1">
                        {issueResult.labels.map((label) => (
                          <span
                            key={label}
                            className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Issue 正文</label>
                    <div className="text-sm p-4 bg-muted rounded-lg whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono">
                      {issueResult.body}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </AppDialogContent>
      </Dialog>
    </>
  );
}
