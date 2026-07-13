import { useMemo, useState } from "react";
import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  localizeConsistencyField,
  localizeConsistencyIssueDetail,
  localizeConsistencyIssueMessage,
  localizeConsistencyIssueTitle,
  localizeConsistencySeverity,
  localizeConsistencySource,
  localizeConsistencyStatus,
} from "../../worldConsistencyUi";

interface WorldConsistencyTabProps {
  report: WorldConsistencyReport | null;
  issues: WorldConsistencyIssue[];
  checkPending: boolean;
  onCheck: (referenceMaterials?: string) => void;
  onPatchIssue: (payload: { issueId: string; status: "open" | "resolved" | "ignored" }) => void;
  onFixIssue?: (issueId: string, customSuggestion?: string) => void;
  fixPendingIssueId?: string | null;
  referenceMaterials?: string;
  onReferenceMaterialsChange?: (value: string) => void;
}

export default function WorldConsistencyTab(props: WorldConsistencyTabProps) {
  const { report, issues, checkPending, onCheck, onPatchIssue, onFixIssue, fixPendingIssueId, referenceMaterials, onReferenceMaterialsChange } = props;
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [showReferenceInput, setShowReferenceInput] = useState(false);
  const [customSuggestion, setCustomSuggestion] = useState<string>("");
  const openIssues = useMemo(() => issues.filter((issue) => issue.status === "open"), [issues]);
  const activeIssue = useMemo(() => {
    if (issues.length === 0) {
      return null;
    }
    return issues.find((issue) => issue.id === activeIssueId)
      ?? openIssues[0]
      ?? issues[0];
  }, [activeIssueId, issues, openIssues]);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  const resolvedCount = issues.filter((issue) => issue.status === "resolved").length;
  const ignoredCount = issues.filter((issue) => issue.status === "ignored").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>世界手册体检</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium">世界手册体检</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              检查核心规则、题材信号、力量体系和冲突支撑是否互相冲突。发现问题后逐条处理即可。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReferenceInput(!showReferenceInput)}
            >
              {showReferenceInput ? "隐藏参考素材" : "导入参考素材"}
            </Button>
            <Button size="sm" onClick={() => onCheck(referenceMaterials)} disabled={checkPending}>
              {checkPending ? "检查中..." : "运行手册体检"}
            </Button>
            {onFixIssue && openIssues.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  openIssues.forEach((issue) => {
                    if ((issue as any).suggestion) {
                      onFixIssue(issue.id);
                    }
                  });
                }}
                disabled={fixPendingIssueId !== null}
              >
                一键修复所有 ({openIssues.filter((i) => (i as any).suggestion).length})
              </Button>
            )}
          </div>
        </div>

        {showReferenceInput && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="mb-2 text-sm font-medium">参考素材</div>
            <div className="mb-2 text-xs text-muted-foreground">
              支持上传 txt、md、json、yaml 格式的文件，或直接粘贴参考内容。AI 将基于这些素材进行自洽校验和提取。
            </div>
            <Textarea
              placeholder="粘贴参考素材内容，或使用文件导入按钮上传文件..."
              value={referenceMaterials ?? ""}
              onChange={(e) => onReferenceMaterialsChange?.(e.target.value)}
              rows={6}
              className="mb-2 resize-none font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".txt,.md,.json,.yaml,.yml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    onReferenceMaterialsChange?.(text);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>选择文件</span>
                </Button>
              </label>
              {referenceMaterials && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReferenceMaterialsChange?.("")}
                >
                  清空
                </Button>
              )}
            </div>
          </div>
        )}

        {report ? (
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">检查状态</div>
              <div className="mt-1 font-semibold">{localizeConsistencyStatus(report.status)}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">一致性分数</div>
              <div className="mt-1 font-semibold">{report.score}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">待处理</div>
              <div className="mt-1 font-semibold">{openIssues.length}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">严重/警告</div>
              <div className="mt-1 font-semibold">{errorCount}/{warnCount}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">已处理</div>
              <div className="mt-1 font-semibold">{resolvedCount + ignoredCount}</div>
            </div>
            <div className="rounded-md border p-3 text-sm md:col-span-5">
              <div className="text-xs text-muted-foreground">检查摘要</div>
              <div className="mt-1 font-medium">{report.summary}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                生成时间：{report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "未知"}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            运行检查后，这里会展示世界手册的体检结果和需要处理的问题。
          </div>
        )}

        {issues.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">问题清单</div>
              {issues.map((issue) => {
                const selected = activeIssue?.id === issue.id;
                const issueWithSuggestion = issue as typeof issue & { suggestion?: string };
                const hasSuggestion = Boolean(issueWithSuggestion.suggestion);
                return (
                  <button
                    key={issue.id}
                    type="button"
                    className={[
                      "w-full rounded-md border p-2 text-left text-sm transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:bg-muted/40",
                    ].join(" ")}
                    onClick={() => setActiveIssueId(issue.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {localizeConsistencyIssueTitle(issue.code)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {localizeConsistencyStatus(issue.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {localizeConsistencySeverity(issue.severity)} · {localizeConsistencyField(issue.targetField)}
                    </div>
                    {hasSuggestion && issue.status === "open" && (
                      <div className="mt-2 text-xs text-blue-600 line-clamp-2">
                        💡 {issueWithSuggestion.suggestion}
                      </div>
                    )}
                    {hasSuggestion && issue.status === "open" && onFixIssue && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFixIssue(issue.id);
                          }}
                          disabled={fixPendingIssueId === issue.id}
                        >
                          {fixPendingIssueId === issue.id ? "修复中..." : "修复"}
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {activeIssue ? (
              <div className="rounded-md border p-3 space-y-3">
                <div>
                  <div className="font-medium">
                    [{localizeConsistencySeverity(activeIssue.severity)}] {localizeConsistencyIssueTitle(activeIssue.code)}
                  </div>
                  <div className="mt-2 text-sm">{localizeConsistencyIssueMessage(activeIssue)}</div>
                </div>
                <div className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
                  {localizeConsistencyIssueDetail(activeIssue) ?? "可以结合世界手册复核这条风险。"}
                </div>
                {(activeIssue as any).suggestion && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                    <div className="font-medium text-blue-800">AI 修复建议</div>
                    <div className="mt-1 text-blue-700">{(activeIssue as any).suggestion}</div>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-blue-800">调整修复方案（可选）</label>
                      <Textarea
                        placeholder="如果对 AI 的建议不满意，可以在这里修改或补充..."
                        value={customSuggestion}
                        onChange={(e) => setCustomSuggestion(e.target.value)}
                        rows={3}
                        className="mt-1 resize-none border-blue-200 text-sm"
                      />
                      <div className="mt-1 text-xs text-muted-foreground">
                        留空则使用 AI 建议，填写后将按你的方案修复
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border p-3 text-xs">
                    <div className="text-muted-foreground">检查来源</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencySource(activeIssue.source)}</div>
                  </div>
                  <div className="rounded-md border p-3 text-xs">
                    <div className="text-muted-foreground">影响内容</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencyField(activeIssue.targetField)}</div>
                  </div>
                  <div className="rounded-md border p-3 text-xs">
                    <div className="text-muted-foreground">处理状态</div>
                    <div className="mt-1 font-medium text-foreground">{localizeConsistencyStatus(activeIssue.status)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onFixIssue && (activeIssue as any).suggestion && activeIssue.status === "open" && (
                    <Button
                      size="sm"
                      onClick={() => onFixIssue(activeIssue.id, customSuggestion || undefined)}
                      disabled={fixPendingIssueId === activeIssue.id}
                    >
                      {fixPendingIssueId === activeIssue.id ? "修复中..." : "应用修复"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPatchIssue({ issueId: activeIssue.id, status: "resolved" })}
                    disabled={activeIssue.status === "resolved"}
                  >
                    标记已解决
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPatchIssue({ issueId: activeIssue.id, status: "ignored" })}
                    disabled={activeIssue.status === "ignored"}
                  >
                    忽略
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            还没有一致性问题记录，运行检查后会在这里展示结果。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
