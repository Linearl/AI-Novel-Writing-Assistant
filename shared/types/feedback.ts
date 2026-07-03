import { z } from "zod";

export const FEEDBACK_SEVERITY_VALUES = ["low", "medium", "high", "critical"] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITY_VALUES)[number];

export const FEEDBACK_CATEGORY_VALUES = [
  "bug",
  "feature",
  "improvement",
  "question",
  "other",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORY_VALUES)[number];

export const FEEDBACK_STATUS_VALUES = ["open", "archived", "deleted"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUS_VALUES)[number];

export const feedbackSubmitSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(200, "标题最多200字"),
  description: z.string().trim().min(1, "描述不能为空").max(5000, "描述最多5000字"),
  severity: z.enum(FEEDBACK_SEVERITY_VALUES).default("medium"),
  category: z.enum(FEEDBACK_CATEGORY_VALUES).default("other"),
});

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;

export const feedbackFolderNameSchema = z.object({
  folderName: z.string().trim().min(1),
});

export const feedbackListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(FEEDBACK_SEVERITY_VALUES).optional(),
  category: z.enum(FEEDBACK_CATEGORY_VALUES).optional(),
  status: z.enum(FEEDBACK_STATUS_VALUES).optional(),
});

export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;

export interface FeedbackListItem {
  folderName: string;
  title: string;
  severity: FeedbackSeverity;
  category: FeedbackCategory;
  status: FeedbackStatus;
  author: string;
  createdAt: string;
  commentCount: number;
}

export interface FeedbackDetail {
  folderName: string;
  title: string;
  description: string;
  severity: FeedbackSeverity;
  category: FeedbackCategory;
  status: FeedbackStatus;
  author: string;
  createdAt: string;
  attachments: string[];
}

export interface FeedbackComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface FeedbackListResponse {
  items: FeedbackListItem[];
  total: number;
  page: number;
  limit: number;
}
