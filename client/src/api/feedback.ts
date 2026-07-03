import type { ApiResponse } from "@ai-novel/shared/types/api";
import type {
  FeedbackListItem,
  FeedbackDetail,
  FeedbackComment,
  FeedbackListResponse,
} from "@ai-novel/shared/types/feedback";
import { apiClient } from "./client";

export async function submitFeedback(payload: {
  title: string;
  description: string;
  severity?: string;
  category?: string;
}) {
  const { data } = await apiClient.post<ApiResponse<{ folderName: string }>>(
    "/feedback",
    payload,
  );
  return data;
}

export async function uploadAttachment(
  folderName: string,
  fileName: string,
  content: string,
) {
  const { data } = await apiClient.post<ApiResponse<{ attachment: string }>>(
    `/feedback/${encodeURIComponent(folderName)}/attachments`,
    { fileName, content },
  );
  return data;
}

export async function listFeedbackAdmin(params: {
  page?: number;
  limit?: number;
  severity?: string;
  category?: string;
  status?: string;
}) {
  const { data } = await apiClient.get<ApiResponse<FeedbackListResponse>>(
    "/feedback/admin/reviews",
    { params },
  );
  return data;
}

export async function getFeedbackDetail(folderName: string) {
  const { data } = await apiClient.get<ApiResponse<FeedbackDetail>>(
    `/feedback/admin/reviews/${encodeURIComponent(folderName)}`,
  );
  return data;
}

export async function archiveFeedback(folderName: string) {
  const { data } = await apiClient.post<ApiResponse<{ folderName: string; status: string }>>(
    `/feedback/admin/reviews/${encodeURIComponent(folderName)}/archive`,
  );
  return data;
}

export async function deleteFeedback(folderName: string) {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/feedback/admin/reviews/${encodeURIComponent(folderName)}`,
  );
  return data;
}

export async function listComments(folderName: string) {
  const { data } = await apiClient.get<ApiResponse<FeedbackComment[]>>(
    `/feedback/${encodeURIComponent(folderName)}/comments`,
  );
  return data;
}

export async function addComment(folderName: string, content: string) {
  const { data } = await apiClient.post<ApiResponse<{ id: string }>>(
    `/feedback/${encodeURIComponent(folderName)}/comments`,
    { content },
  );
  return data;
}
