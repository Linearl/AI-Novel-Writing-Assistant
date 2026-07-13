import React from "react";
import type { CharacterResourceProposalSummary } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import {
  formatRiskLevel,
  formatProposalSource,
  readProposalPayloadText,
} from "./novelTaskDrawer.utils";

export function RejectIntentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName: string;
  onSubmit: (intent: string) => void;
  isSubmitting?: boolean;
}) {
  const { open, onOpenChange, resourceName, onSubmit, isSubmitting } = props;
  const [intent, setIntent] = React.useState("");

  const handleSubmit = () => {
    onSubmit(intent.trim());
    setIntent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>不接受此风险</DialogTitle>
          <DialogDescription>
            你拒绝了「{resourceName}」的高风险变更。请描述你希望 AI 如何修正，以便后续修复参考你的意图。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          placeholder="例如：保留原角色性格不变，不要引入新的身份设定"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "提交中..." : "提交并拒绝"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResourceProposalCard(props: {
  proposal: CharacterResourceProposalSummary;
  onOpenSource?: (proposal: CharacterResourceProposalSummary) => void;
  onConfirm?: (proposalId: string) => void;
  onReject?: (proposalId: string, intent?: string) => void;
  confirmingProposalId?: string;
  rejectingProposalId?: string;
}) {
  const {
    proposal,
    onOpenSource,
    onConfirm,
    onReject,
    confirmingProposalId = "",
    rejectingProposalId = "",
  } = props;
  const resourceName = readProposalPayloadText(proposal, "resourceName") || "关键资源";
  const holderName = readProposalPayloadText(proposal, "holderCharacterName");
  const narrativeImpact = readProposalPayloadText(proposal, "narrativeImpact");
  const isConfirming = confirmingProposalId === proposal.id;
  const isRejecting = rejectingProposalId === proposal.id;
  const [showIntentDialog, setShowIntentDialog] = React.useState(false);

  return (
    <div className="space-y-3 rounded-xl border bg-background/80 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{resourceName}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {holderName ? `${holderName}相关资源` : "资源归属需要确认"}
          </div>
        </div>
        <Badge variant={proposal.riskLevel === "high" ? "destructive" : "secondary"}>
          {formatRiskLevel(proposal.riskLevel)}
        </Badge>
      </div>
      <div className="text-sm leading-6 text-muted-foreground">{proposal.summary}</div>
      {narrativeImpact ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
          确认后影响：{narrativeImpact}
        </div>
      ) : null}
      {proposal.evidence[0] ? (
        <div className="text-xs leading-5 text-muted-foreground">证据：{proposal.evidence[0]}</div>
      ) : null}
      {proposal.validationNotes[0] ? (
        <div className="text-xs leading-5 text-muted-foreground">判断原因：{proposal.validationNotes[0]}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{formatProposalSource(proposal)}</Badge>
        {proposal.chapterId ? <Badge variant="outline">来源章节</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {proposal.chapterId ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={`/novels/${proposal.novelId}/chapters/${proposal.chapterId}`}>编辑来源章节</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => onConfirm?.(proposal.id)}
          disabled={isConfirming || !onConfirm}
        >
          {isConfirming ? "确认中..." : "确认并用于后续写作"}
        </Button>
        {proposal.riskLevel === "high" ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setShowIntentDialog(true)}
            disabled={isRejecting || !onReject}
          >
            {isRejecting ? "处理中..." : "不接受此风险"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onReject?.(proposal.id)}
            disabled={isRejecting || !onReject}
          >
            {isRejecting ? "处理中..." : "忽略这条变化"}
          </Button>
        )}
      </div>
      {proposal.riskLevel === "high" ? (
        <RejectIntentDialog
          open={showIntentDialog}
          onOpenChange={setShowIntentDialog}
          resourceName={resourceName}
          isSubmitting={isRejecting}
          onSubmit={(intent) => {
            onReject?.(proposal.id, intent || undefined);
            setShowIntentDialog(false);
          }}
        />
      ) : null}
    </div>
  );
}
