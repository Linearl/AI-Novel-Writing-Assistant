import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Archive, Send } from "lucide-react";
import {
  getFeedbackDetail,
  archiveFeedback,
  listComments,
  addComment,
} from "@/api/feedback";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  archived: "已归档",
  deleted: "已删除",
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "功能建议",
  improvement: "改进",
  question: "问题咨询",
  other: "其他",
};

export default function FeedbackDetailPage() {
  const { folderName } = useParams<{ folderName: string }>();
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.feedback.detail(folderName ?? ""),
    queryFn: () => getFeedbackDetail(folderName!),
    enabled: !!folderName,
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.feedback.comments(folderName ?? ""),
    queryFn: () => listComments(folderName!),
    enabled: !!folderName,
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveFeedback(folderName!),
    onSuccess: () => {
      toast.success("已归档");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.detail(folderName!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.list("") });
    },
    onError: () => toast.error("归档失败"),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(folderName!, commentText),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.comments(folderName!) });
    },
    onError: () => toast.error("评论失败"),
  });

  const detail = detailQuery.data?.data;
  const comments = commentsQuery.data?.data ?? [];

  if (detailQuery.isLoading) {
    return (
      <LoadingIndicator className="py-12" />
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">反馈不存在</p>
        <Button asChild variant="outline">
          <Link to="/feedback">返回列表</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/feedback">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回列表
          </Link>
        </Button>
        {detail.status === "open" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            <Archive className="mr-1 h-4 w-4" />
            归档
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={SEVERITY_COLORS[detail.severity] ?? ""}>
              {detail.severity}
            </Badge>
            <Badge variant="outline">{CATEGORY_LABELS[detail.category] ?? detail.category}</Badge>
            <Badge variant="secondary">{STATUS_LABELS[detail.status] ?? detail.status}</Badge>
          </div>
          <CardTitle>{detail.title}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {detail.author} &middot; {new Date(detail.createdAt).toLocaleString("zh-CN")}
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-6">
            {detail.description}
          </div>

          {detail.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">附件</div>
              <div className="flex flex-wrap gap-2">
                {detail.attachments.map((name) => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">评论 ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <EmptyState>暂无评论</EmptyState>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{comment.author}</span>
                  <span>&middot;</span>
                  <span>{new Date(comment.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p className="mt-1.5 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}

          <div className="flex gap-2">
            <Input
              placeholder="添加评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                  e.preventDefault();
                  commentMutation.mutate();
                }
              }}
              disabled={commentMutation.isPending}
            />
            <Button
              size="sm"
              onClick={() => commentMutation.mutate()}
              disabled={!commentText.trim() || commentMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
