import { useState, useRef, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { importWritingTechnique, type WritingTechniqueDetail } from "@/api/writingTechniques";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";

interface ImportTechniqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportTechniqueDialog({ open, onOpenChange }: ImportTechniqueDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textContent, setTextContent] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [fileName, setFileName] = useState<string | undefined>();
  const [previewResult, setPreviewResult] = useState<WritingTechniqueDetail | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: ({ content, fileName }: { content: string; fileName?: string }) =>
      importWritingTechnique(content, fileName),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.writingTechniques });
      setPreviewResult(result);
      setDuplicateError(null);
      toast(`技法「${result.name}」导入成功`);
    },
    onError: (error: Error) => {
      const message = error.message || "导入失败";
      if (message.includes("已存在")) {
        setDuplicateError(message);
      } else {
        toast.error(message);
      }
    },
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTextContent(content);
      setFileName(file.name.replace(/\.\w+$/, ""));
      setActiveTab("text");
    };
    reader.readAsText(file);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = textContent.trim();
    if (!content) return;

    setPreviewResult(null);
    setDuplicateError(null);
    importMutation.mutate({ content, fileName });
  }

  function handleClose() {
    setTextContent("");
    setFileName(undefined);
    setPreviewResult(null);
    setDuplicateError(null);
    setActiveTab("text");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <AppDialogContent
        className="max-w-2xl"
        title="导入写作技法"
        description="粘贴技法内容或上传文件，AI 将自动解析为标准格式"
        footer={
          previewResult ? (
            <Button type="button" onClick={handleClose}>完成</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>取消</Button>
              <Button
                type="submit"
                form="import-technique-form"
                disabled={!textContent.trim() || importMutation.isPending}
              >
                {importMutation.isPending ? "解析中..." : "导入"}
              </Button>
            </>
          )
        }
      >
        {previewResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-sm font-semibold text-foreground">{previewResult.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{previewResult.description}</div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="rounded bg-muted px-2 py-0.5">{previewResult.category}</span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono">{previewResult.key}</span>
                <span className="rounded bg-muted px-2 py-0.5">{previewResult.enabled ? "已启用" : "未启用"}</span>
              </div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-lg border p-4 font-mono text-sm leading-relaxed">
              {previewResult.body}
            </div>
          </div>
        ) : (
          <form id="import-technique-form" className="space-y-4" onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="text" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  文本输入
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  文件上传
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <Textarea
                  className="min-h-[280px] font-mono text-sm"
                  placeholder={"粘贴写作技法内容，例如：\n\n倒喻是一种修辞手法，通过反转主客关系，让景物主动贴合心境...\n\nAI 将自动识别技法名称、分类，并生成标准格式。"}
                  value={textContent}
                  onChange={(e) => {
                    setTextContent(e.target.value);
                    setFileName(undefined);
                    setDuplicateError(null);
                  }}
                />
              </TabsContent>

              <TabsContent value="file">
                <div
                  className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">点击选择 .md 或 .txt 文件</p>
                    {fileName && (
                      <p className="mt-1 text-xs text-foreground">已选择：{fileName}</p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.markdown"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {duplicateError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{duplicateError}</span>
              </div>
            )}
          </form>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
