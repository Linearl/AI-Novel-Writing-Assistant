import type { CharacterResourceLedgerItem } from "@ai-novel/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getResourceStatusLabel } from "./characterResourceLabels";

const statusOptions: Array<{ value: CharacterResourceLedgerItem["status"]; label: string; description: string }> = [
  { value: "available", label: "可用", description: "资源正常，角色可以随时使用" },
  { value: "hidden", label: "隐藏", description: "资源存在但被隐藏或尚未揭示" },
  { value: "borrowed", label: "借用", description: "暂时借给其他角色使用" },
  { value: "transferred", label: "转交", description: "所有权或使用权已转交他人" },
  { value: "lost", label: "丢失", description: "资源遗失，不再持有" },
  { value: "consumed", label: "已消耗", description: "资源已被消耗或用尽" },
  { value: "damaged", label: "受损", description: "资源受损但未完全毁坏" },
  { value: "destroyed", label: "毁坏", description: "资源已彻底毁坏" },
  { value: "stale", label: "淡出", description: "资源已不再影响当前叙事" },
];

export interface ResourceLedgerStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: CharacterResourceLedgerItem | null;
  currentStatus: CharacterResourceLedgerItem["status"];
  onChangeStatus: (resourceId: string, newStatus: CharacterResourceLedgerItem["status"]) => void;
  isSubmitting: boolean;
}

export default function ResourceLedgerStatusDialog({
  open,
  onOpenChange,
  resource,
  currentStatus,
  onChangeStatus,
  isSubmitting,
}: ResourceLedgerStatusDialogProps) {
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>状态流转</DialogTitle>
          <DialogDescription>
            「{resource.name}」当前状态为：
            <span className="ml-1 font-medium text-foreground">{getResourceStatusLabel(currentStatus)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isSubmitting || option.value === currentStatus}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                option.value === currentStatus
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => {
                onChangeStatus(resource.id, option.value);
              }}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
