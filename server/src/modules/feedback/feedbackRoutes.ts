import { Router } from "express";
import { z } from "zod";
import type { ApiResponse } from "@ai-novel/shared";
import {
  feedbackSubmitSchema,
  feedbackFolderNameSchema,
  feedbackListQuerySchema,
  type FeedbackSeverity,
  type FeedbackCategory,
  type FeedbackListItem,
  type FeedbackDetail,
} from "@ai-novel/shared";
import { authMiddleware } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { logger } from "../../services/logging/LoggerService";
import {
  createFeedbackFolder,
  saveAttachment,
  listFeedbackFolders,
  readFeedbackDetail,
  updateFeedbackStatus,
  deleteFeedbackFolder,
  createComment,
  listComments,
  readFeedbackMeta,
} from "./feedbackStorage";
import { generateIssue } from "./issueGenerator";

const router = Router();

router.use(authMiddleware);

// ── Submit feedback ──────────────────────────────────────────────
router.post(
  "/",
  validate({ body: feedbackSubmitSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof feedbackSubmitSchema>;
      const author = (req.headers["x-api-key"] as string) ?? "anonymous";
      const timestamp = Date.now();
      const folderName = `${author}_${timestamp}`;

      await createFeedbackFolder(folderName, {
        title: input.title,
        description: input.description,
        severity: input.severity,
        category: input.category,
        status: "open",
        author,
        createdAt: new Date().toISOString(),
      });

      const response: ApiResponse<{ folderName: string }> = {
        success: true,
        data: { folderName },
      };
      res.status(201).json(response);
    } catch (error) {
      logger.error("[feedback] submit failed", error);
      next(error);
    }
  },
);

// ── Upload attachment ────────────────────────────────────────────
const attachmentBodySchema = z.object({
  fileName: z.string().trim().min(1),
  content: z.string().trim().min(1, "附件内容不能为空"),
});

router.post(
  "/:folderName/attachments",
  validate({ params: feedbackFolderNameSchema, body: attachmentBodySchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const { fileName, content } = req.body as z.infer<typeof attachmentBodySchema>;

      const buffer = Buffer.from(content, "base64");
      const savedName = await saveAttachment(folderName, fileName, buffer);

      const response: ApiResponse<{ attachment: string }> = {
        success: true,
        data: { attachment: savedName },
      };
      res.status(201).json(response);
    } catch (error) {
      logger.error("[feedback] attachment upload failed", error);
      next(error);
    }
  },
);

// ── Generate Issue from feedback ───────────────────────────────
const generateBodySchema = z.object({
  description: z.string().trim().min(1, "描述不能为空").max(10000),
  context: z.string().trim().max(100000).optional().default("{}"),
  images: z.array(z.object({
    fileName: z.string().trim().min(1),
    base64: z.string().trim().min(1),
  })).max(5).optional(),
});

router.post(
  "/generate",
  validate({ body: generateBodySchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof generateBodySchema>;

      const result = await generateIssue({
        description: input.description,
        contextJson: input.context,
        images: input.images,
      });

      const response: ApiResponse<{
        title: string;
        body: string;
        labels: string[];
        markdown: string;
      }> = {
        success: true,
        data: {
          title: result.title,
          body: result.body,
          labels: result.labels,
          markdown: `# ${result.title}\n\n${result.body}`,
        },
      };
      res.status(201).json(response);
    } catch (error) {
      logger.error("[feedback] generate issue failed", error);
      next(error);
    }
  },
);

// ── Admin: list feedback ─────────────────────────────────────────
router.get(
  "/admin/reviews",
  validate({ query: feedbackListQuerySchema }),
  async (req, res, next) => {
    try {
      const query = feedbackListQuerySchema.parse(req.query);
      const allFolders = await listFeedbackFolders();

      const items: FeedbackListItem[] = [];
      for (const folderName of allFolders) {
        const meta = await readFeedbackMeta(folderName);
        if (!meta) continue;
        if (query.severity && meta.severity !== query.severity) continue;
        if (query.category && meta.category !== query.category) continue;
        if (query.status && meta.status !== query.status) continue;

        let commentCount = 0;
        try {
          const comments = await listComments(folderName);
          commentCount = comments.length;
        } catch {
          // ignore
        }

        items.push({
          folderName,
          title: meta.title,
          severity: meta.severity as FeedbackSeverity,
          category: meta.category as FeedbackCategory,
          status: meta.status as "open" | "archived" | "deleted",
          author: meta.author,
          createdAt: meta.createdAt,
          commentCount,
        });
      }

      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const total = items.length;
      const start = (query.page - 1) * query.limit;
      const paged = items.slice(start, start + query.limit);

      const response: ApiResponse<{
        items: FeedbackListItem[];
        total: number;
        page: number;
        limit: number;
      }> = {
        success: true,
        data: { items: paged, total, page: query.page, limit: query.limit },
      };
      res.json(response);
    } catch (error) {
      logger.error("[feedback] list failed", error);
      next(error);
    }
  },
);

// ── Admin: get feedback detail ───────────────────────────────────
router.get(
  "/admin/reviews/:folderName",
  validate({ params: feedbackFolderNameSchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const detail = await readFeedbackDetail(folderName);

      if (!detail) {
        const response: ApiResponse<null> = {
          success: false,
          error: "反馈不存在",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<FeedbackDetail> = {
        success: true,
        data: detail as FeedbackDetail,
      };
      res.json(response);
    } catch (error) {
      logger.error("[feedback] detail failed", error);
      next(error);
    }
  },
);

// ── Admin: archive feedback ──────────────────────────────────────
router.post(
  "/admin/reviews/:folderName/archive",
  validate({ params: feedbackFolderNameSchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const updated = await updateFeedbackStatus(folderName, "archived");

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: "反馈不存在",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ folderName: string; status: string }> = {
        success: true,
        data: { folderName, status: "archived" },
      };
      res.json(response);
    } catch (error) {
      logger.error("[feedback] archive failed", error);
      next(error);
    }
  },
);

// ── Admin: delete feedback ───────────────────────────────────────
router.delete(
  "/admin/reviews/:folderName",
  validate({ params: feedbackFolderNameSchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const deleted = await deleteFeedbackFolder(folderName);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: "反馈不存在",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<null> = {
        success: true,
      };
      res.json(response);
    } catch (error) {
      logger.error("[feedback] delete failed", error);
      next(error);
    }
  },
);

// ── List comments ────────────────────────────────────────────────
router.get(
  "/:folderName/comments",
  validate({ params: feedbackFolderNameSchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const comments = await listComments(folderName);

      const response: ApiResponse<typeof comments> = {
        success: true,
        data: comments,
      };
      res.json(response);
    } catch (error) {
      logger.error("[feedback] list comments failed", error);
      next(error);
    }
  },
);

// ── Add comment ──────────────────────────────────────────────────
const commentBodySchema = z.object({
  content: z.string().trim().min(1, "评论内容不能为空").max(2000, "评论最多2000字"),
});

router.post(
  "/:folderName/comments",
  validate({ params: feedbackFolderNameSchema, body: commentBodySchema }),
  async (req, res, next) => {
    try {
      const { folderName } = req.params as z.infer<typeof feedbackFolderNameSchema>;
      const { content } = req.body as z.infer<typeof commentBodySchema>;
      const author = (req.headers["x-api-key"] as string) ?? "anonymous";
      const commentId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await createComment(folderName, commentId, author, content);

      const response: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: commentId },
      };
      res.status(201).json(response);
    } catch (error) {
      logger.error("[feedback] add comment failed", error);
      next(error);
    }
  },
);

export default router;
