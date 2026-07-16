import { useEffect, useMemo, useState } from "react";
import type { Character, CharacterResourceLedgerItem } from "@ai-novel/shared";
import type { CharacterResourceManualCreatePayload, CharacterResourceManualUpdatePayload } from "@ai-novel/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ResourceLedgerEditDialogProps {
  novelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  mode: "create" | "edit";
  resource?: CharacterResourceLedgerItem | null;
  onSubmit: (payload: CharacterResourceManualCreatePayload) => void;
  isSubmitting: boolean;
  openDelay?: number;
}

type FormState = {
  name: string;
  summary: string;
  resourceType: string;
  narrativeFunction: string;
  status: string;
  ownerType: string;
  holderCharacterId: string;
  holderCharacterName: string;
  ownerId: string;
  ownerName: string;
  readerKnows: boolean;
  holderKnows: boolean;
  introducedChapterOrder: string;
  lastTouchedChapterOrder: string;
  expectedUseStartChapterOrder: string;
  expectedUseEndChapterOrder: string;
  confidence: string;
};

const resourceTypeOptions: Array<{ value: string; label: string }> = [
  { value: "physical_item", label: "实物" },
  { value: "clue", label: "线索物" },
  { value: "credential", label: "凭证" },
  { value: "ability_resource", label: "能力" },
  { value: "relationship_token", label: "关系信物" },
  { value: "consumable", label: "消耗品" },
  { value: "hidden_card", label: "底牌" },
  { value: "world_resource", label: "世界资源" },
];

const narrativeFunctionOptions: Array<{ value: string; label: string }> = [
  { value: "tool", label: "工具" },
  { value: "clue", label: "线索" },
  { value: "weapon", label: "武器" },
  { value: "proof", label: "证据" },
  { value: "key", label: "钥匙" },
  { value: "cost", label: "代价" },
  { value: "promise", label: "伏笔" },
  { value: "hidden_card", label: "底牌" },
  { value: "constraint", label: "限制" },
];

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "available", label: "可用" },
  { value: "hidden", label: "隐藏" },
  { value: "borrowed", label: "借用" },
  { value: "transferred", label: "转交" },
  { value: "lost", label: "丢失" },
  { value: "consumed", label: "已消耗" },
  { value: "damaged", label: "受损" },
  { value: "destroyed", label: "毁坏" },
  { value: "stale", label: "淡出" },
];

const ownerTypeOptions: Array<{ value: string; label: string }> = [
  { value: "character", label: "角色" },
  { value: "organization", label: "组织" },
  { value: "location", label: "地点" },
  { value: "world", label: "世界" },
  { value: "unknown", label: "未知" },
];

function emptyForm(): FormState {
  return {
    name: "",
    summary: "",
    resourceType: "physical_item",
    narrativeFunction: "tool",
    status: "available",
    ownerType: "character",
    holderCharacterId: "",
    holderCharacterName: "",
    ownerId: "",
    ownerName: "",
    readerKnows: false,
    holderKnows: true,
    introducedChapterOrder: "",
    lastTouchedChapterOrder: "",
    expectedUseStartChapterOrder: "",
    expectedUseEndChapterOrder: "",
    confidence: "",
  };
}

function resourceToForm(resource: CharacterResourceLedgerItem): FormState {
  return {
    name: resource.name,
    summary: resource.summary,
    resourceType: resource.resourceType,
    narrativeFunction: resource.narrativeFunction,
    status: resource.status,
    ownerType: resource.ownerType,
    holderCharacterId: resource.holderCharacterId ?? "",
    holderCharacterName: resource.holderCharacterName ?? "",
    ownerId: resource.ownerId ?? "",
    ownerName: resource.ownerName ?? "",
    readerKnows: resource.readerKnows,
    holderKnows: resource.holderKnows,
    introducedChapterOrder: resource.introducedChapterOrder != null ? String(resource.introducedChapterOrder) : "",
    lastTouchedChapterOrder: resource.lastTouchedChapterOrder != null ? String(resource.lastTouchedChapterOrder) : "",
    expectedUseStartChapterOrder: resource.expectedUseStartChapterOrder != null ? String(resource.expectedUseStartChapterOrder) : "",
    expectedUseEndChapterOrder: resource.expectedUseEndChapterOrder != null ? String(resource.expectedUseEndChapterOrder) : "",
    confidence: resource.confidence != null ? String(resource.confidence) : "",
  };
}

function parseNumber(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

export default function ResourceLedgerEditDialog({
  novelId: _novelId,
  open,
  onOpenChange,
  characters,
  mode,
  resource,
  onSubmit,
  isSubmitting,
}: ResourceLedgerEditDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (open) {
      if (mode === "edit" && resource) {
        setForm(resourceToForm(resource));
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, mode, resource]);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;

    const payload: CharacterResourceManualCreatePayload = {
      name: form.name.trim(),
      summary: form.summary.trim(),
      resourceType: form.resourceType as CharacterResourceManualCreatePayload["resourceType"],
      narrativeFunction: form.narrativeFunction as CharacterResourceManualCreatePayload["narrativeFunction"],
      status: form.status as CharacterResourceManualCreatePayload["status"],
      ownerType: form.ownerType as CharacterResourceManualCreatePayload["ownerType"],
      readerKnows: form.readerKnows,
      holderKnows: form.holderKnows,
      constraints: [],
    };

    if (form.holderCharacterId) {
      payload.holderCharacterId = form.holderCharacterId;
      const c = characters.find((ch) => ch.id === form.holderCharacterId);
      if (c) payload.holderCharacterName = c.name;
    }
    if (form.ownerId) {
      payload.ownerId = form.ownerId;
    }
    if (form.ownerName.trim()) {
      payload.ownerName = form.ownerName.trim();
    } else if (form.holderCharacterId) {
      const c = characters.find((ch) => ch.id === form.holderCharacterId);
      if (c) payload.ownerName = c.name;
    }

    const chapterOrders = {
      introducedChapterOrder: parseNumber(form.introducedChapterOrder),
      lastTouchedChapterOrder: parseNumber(form.lastTouchedChapterOrder),
      expectedUseStartChapterOrder: parseNumber(form.expectedUseStartChapterOrder),
      expectedUseEndChapterOrder: parseNumber(form.expectedUseEndChapterOrder),
      confidence: parseNumber(form.confidence),
    };

    if (chapterOrders.introducedChapterOrder != null) payload.introducedChapterOrder = chapterOrders.introducedChapterOrder;
    if (chapterOrders.lastTouchedChapterOrder != null) payload.lastTouchedChapterOrder = chapterOrders.lastTouchedChapterOrder;
    if (chapterOrders.expectedUseStartChapterOrder != null) payload.expectedUseStartChapterOrder = chapterOrders.expectedUseStartChapterOrder;
    if (chapterOrders.expectedUseEndChapterOrder != null) payload.expectedUseEndChapterOrder = chapterOrders.expectedUseEndChapterOrder;
    if (chapterOrders.confidence != null) payload.confidence = chapterOrders.confidence;

    onSubmit(payload);
  };

  const isValid = form.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-5 py-3 pr-12">
          <DialogTitle>{mode === "create" ? "新增资源" : "编辑资源"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "手动添加一条角色资源记录" : `编辑「${resource?.name ?? ""}」`}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="例如：长生剑"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">类型</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.resourceType}
                  onChange={(e) => handleChange("resourceType", e.target.value)}
                >
                  {resourceTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">叙事功能</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.narrativeFunction}
                  onChange={(e) => handleChange("narrativeFunction", e.target.value)}
                >
                  {narrativeFunctionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">状态</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">摘要</label>
              <Textarea
                className="min-h-[60px] p-2"
                placeholder="一句话描述这个资源..."
                value={form.summary}
                onChange={(e) => handleChange("summary", e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">拥有者类型</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.ownerType}
                  onChange={(e) => handleChange("ownerType", e.target.value)}
                >
                  {ownerTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">持有角色</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.holderCharacterId}
                  onChange={(e) => {
                    handleChange("holderCharacterId", e.target.value);
                    const c = characters.find((ch) => ch.id === e.target.value);
                    if (c) handleChange("holderCharacterName", c.name);
                  }}
                >
                  <option value="">- 不指定 -</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">拥有者名称</label>
                <Input
                  placeholder="角色名或组织名"
                  value={form.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">持有者名称</label>
                <Input
                  placeholder="当前持有者"
                  value={form.holderCharacterName}
                  onChange={(e) => handleChange("holderCharacterName", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">读者知情</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.readerKnows ? "true" : "false"}
                  onChange={(e) => handleChange("readerKnows", e.target.value === "true")}
                >
                  <option value="false">否</option>
                  <option value="true">是</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">持有者知情</label>
                <select
                  className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={form.holderKnows ? "true" : "false"}
                  onChange={(e) => handleChange("holderKnows", e.target.value === "true")}
                >
                  <option value="false">否</option>
                  <option value="true">是</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">引入章序</label>
                <Input
                  placeholder="例: 3"
                  value={form.introducedChapterOrder}
                  onChange={(e) => handleChange("introducedChapterOrder", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">最近章序</label>
                <Input
                  placeholder="例: 10"
                  value={form.lastTouchedChapterOrder}
                  onChange={(e) => handleChange("lastTouchedChapterOrder", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">使用起始</label>
                <Input
                  placeholder="例: 5"
                  value={form.expectedUseStartChapterOrder}
                  onChange={(e) => handleChange("expectedUseStartChapterOrder", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">使用结束</label>
                <Input
                  placeholder="例: 20"
                  value={form.expectedUseEndChapterOrder}
                  onChange={(e) => handleChange("expectedUseEndChapterOrder", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">置信度 (0-1)</label>
              <Input
                placeholder="例: 0.8"
                value={form.confidence}
                onChange={(e) => handleChange("confidence", e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? "创建中..."
                : "保存中..."
              : mode === "create"
                ? "创建资源"
                : "保存变更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
