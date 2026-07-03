import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Trash2,
} from "lucide-react";
import { listFeedbackAdmin, archiveFeedback, deleteFeedback } from "@/api/feedback";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function FeedbackList() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const params = {
    page,
    limit: 20,
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };
  const paramsKey = JSON.stringify(params);

  const feedbackQuery = useQuery({
    queryKey: queryKeys.feedback.list(paramsKey),
    queryFn: () => listFeedbackAdmin(params),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveFeedback,
    onSuccess: () => {
      toast.success("已归档");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.list("") });
    },
    onError: () => toast.error("归档失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => {
      toast.success("已删除");
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.list("") });
    },
    onError: () => toast.error("删除失败"),
  });

  const data = feedbackQuery.data?.data;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">反馈管理</h1>
        <Badge variant="outline">{data?.total ?? 0} 条反馈</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="严重程度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部程度</SelectItem>
            <SelectItem value="low">低</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="critical">严重</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">功能建议</SelectItem>
            <SelectItem value="improvement">改进</SelectItem>
            <SelectItem value="question">问题咨询</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="open">待处理</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {feedbackQuery.isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : !data?.items.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Inbox className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">暂无反馈</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.items.map((item) => (
            <Card key={item.folderName} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={SEVERITY_COLORS[item.severity] ?? ""}>
                      {item.severity}
                    </Badge>
                    <Badge variant="outline">{CATEGORY_LABELS[item.category] ?? item.category}</Badge>
                    <Badge variant="secondary">{STATUS_LABELS[item.status] ?? item.status}</Badge>
                    {item.commentCount > 0 && (
                      <Badge variant="outline">{item.commentCount} 评论</Badge>
                    )}
                  </div>
                  <Link
                    to={`/feedback/${item.folderName}`}
                    className="font-semibold hover:underline"
                  >
                    {item.title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.author} &middot; {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.status === "open" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveMutation.mutate(item.folderName)}
                      disabled={archiveMutation.isPending}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("确认删除此反馈？")) {
                        deleteMutation.mutate(item.folderName);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
