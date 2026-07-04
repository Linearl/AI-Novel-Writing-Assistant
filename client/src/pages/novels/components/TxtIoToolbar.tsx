import { useCallback, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readTextFile, isTxtFile } from "@/lib/textFile";
import { createDownload } from "@/pages/novels/novelEditHelpers";
import { toast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFn = () => Promise<{ blob: Blob; fileName: string }>;
type ImportFn = (content: string, mode: string) => Promise<{ success: boolean; count?: number }>;

export interface TxtIoToolbarProps {
  /** Show the export button */
  showExport?: boolean;
  /** Show the import button */
  showImport?: boolean;
  /** Label next to buttons, e.g. "世界" / "大纲" / "角色" */
  assetLabel: string;
  /** Async function that fetches the TXT blob and filename */
  onExport: ExportFn;
  /** Async function that sends text content to the server. mode = first option value */
  onImport: ImportFn;
  /** Import mode options. Default: [{ value: "overwrite", label: "覆盖" }, { value: "merge", label: "合并" }] */
  importModeOptions?: Array<{ value: string; label: string }>;
  /** Called after a successful import so the parent can refresh data */
  onImportSuccess?: () => void;
  /** Disable all buttons (e.g. while parent is loading) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TxtIoToolbar(props: TxtIoToolbarProps) {
  const {
    showExport = true,
    showImport = true,
    assetLabel,
    onExport,
    onImport,
    importModeOptions,
    onImportSuccess,
    disabled = false,
  } = props;

  const modes = importModeOptions ?? [
    { value: "overwrite", label: "覆盖" },
    { value: "merge", label: "合并" },
  ];
  const defaultMode = modes[0]?.value ?? "overwrite";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState(defaultMode);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // ---- Export ----
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const { blob, fileName } = await onExport();
      createDownload(blob, fileName);
      toast.success(`${assetLabel} TXT 已导出。`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${assetLabel} 导出失败。`);
    } finally {
      setIsExporting(false);
    }
  }, [onExport, assetLabel]);

  // ---- Import ----
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!isTxtFile(file)) {
      toast.error("请选择 .txt 格式的文件。");
      return;
    }
    setSelectedFile(file);
    setImportDialogOpen(true);
    // Reset the input so re-selecting the same file triggers change
    event.target.value = "";
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const content = await readTextFile(selectedFile);
      if (!content.trim()) {
        toast.error("文件内容为空，无法导入。");
        return;
      }
      const result = await onImport(content, importMode);
      setImportDialogOpen(false);
      setSelectedFile(null);
      toast.success(`${assetLabel}导入完成，共 ${result.count ?? 0} 条。`);
      onImportSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${assetLabel} 导入失败。`);
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, importMode, onImport, assetLabel, onImportSuccess]);

  if (!showExport && !showImport) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showExport ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || isExporting}
            onClick={handleExport}
          >
            <Download className="size-3.5" />
            {isExporting ? "导出中..." : "导出 TXT"}
          </Button>
        ) : null}
        {showImport ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {isImporting ? "导入中..." : "导入 TXT"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        ) : null}
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入 {assetLabel} TXT</DialogTitle>
            <DialogDescription>
              {selectedFile ? `文件：${selectedFile.name}` : "选择导入文件"}
            </DialogDescription>
          </DialogHeader>

          {modes.length > 1 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">导入方式</div>
              <div className="flex gap-2">
                {modes.map((mode) => (
                  <label key={mode.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="txt-import-mode"
                      value={mode.value}
                      checked={importMode === mode.value}
                      onChange={() => setImportMode(mode.value)}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isImporting}>取消</Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!selectedFile || isImporting}
              onClick={handleImportConfirm}
            >
              {isImporting ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
