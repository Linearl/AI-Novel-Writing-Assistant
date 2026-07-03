import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Upload, X } from "lucide-react";
import { submitFeedback, uploadAttachment } from "@/api/feedback";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  AppDialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface FileEntry {
  name: string;
  base64: string;
}

export default function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("other");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await submitFeedback({
        title,
        description,
        severity,
        category,
      });
      const folderName = result.data?.folderName;
      if (folderName) {
        for (const file of files) {
          await uploadAttachment(folderName, file.name, file.base64);
        }
      }
      return result;
    },
    onSuccess: () => {
      toast.success("反馈已提交，感谢您的反馈！");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.list("") });
      resetForm();
      setOpen(false);
    },
    onError: () => {
      toast.error("提交失败，请稍后重试");
    },
  });

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setSeverity("medium");
    setCategory("other");
    setFiles([]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FileEntry[] = [];
    for (const file of Array.from(selectedFiles)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1] ?? "";
        newFiles.push({ name: file.name, base64 });
        if (newFiles.length === selectedFiles.length) {
          setFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          提交反馈
        </Button>
      </DialogTrigger>
      <AppDialogContent
        title="提交反馈"
        description="报告问题或提出建议，帮助我们改进产品。"
        footer={
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? "提交中..." : "提交反馈"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <Input
              placeholder="简要描述您的反馈"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">详细描述</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="请详细描述您遇到的问题或建议..."
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

          <div className="space-y-2">
            <label className="text-sm font-medium">附件</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("feedback-file-input")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                选择文件
              </Button>
              <input
                id="feedback-file-input"
                type="file"
                className="hidden"
                multiple
                accept="image/*,.log,.txt"
                onChange={handleFileSelect}
              />
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
