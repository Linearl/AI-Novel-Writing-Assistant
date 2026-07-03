import fs from "node:fs/promises";
import path from "node:path";
import { resolveServerRoot } from "../../runtime/appPaths";

const FEEDBACK_STORAGE_DIR = "storage/feedback";

function resolveFeedbackRoot(): string {
  return path.join(resolveServerRoot(), FEEDBACK_STORAGE_DIR);
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

export interface FeedbackMetadata {
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface StoredFeedback extends FeedbackMetadata {
  folderName: string;
  attachments: string[];
}

export async function ensureFeedbackRoot(): Promise<string> {
  const root = resolveFeedbackRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export function buildFolderName(userId: string, timestamp: number): string {
  return sanitizeFolderName(`${userId}_${timestamp}`);
}

export async function createFeedbackFolder(
  folderName: string,
  metadata: FeedbackMetadata,
): Promise<void> {
  const root = await ensureFeedbackRoot();
  const feedbackDir = path.join(root, folderName);
  await fs.mkdir(feedbackDir, { recursive: true });

  const markdown = buildIssueMarkdown(metadata);
  await fs.writeFile(path.join(feedbackDir, "issue.md"), markdown, "utf-8");

  const metaPath = path.join(feedbackDir, "meta.json");
  await fs.writeFile(metaPath, JSON.stringify({ ...metadata, folderName }, null, 2), "utf-8");
}

export async function saveAttachment(
  folderName: string,
  originalName: string,
  buffer: Buffer,
): Promise<string> {
  const root = resolveFeedbackRoot();
  const attachmentDir = path.join(root, folderName, "attachments");
  await fs.mkdir(attachmentDir, { recursive: true });

  const safeName = sanitizeFolderName(originalName);
  const dest = path.join(attachmentDir, safeName);
  await fs.writeFile(dest, buffer);
  return safeName;
}

export async function listFeedbackFolders(): Promise<string[]> {
  const root = await ensureFeedbackRoot();
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function readFeedbackMeta(folderName: string): Promise<StoredFeedback | null> {
  const root = resolveFeedbackRoot();
  const metaPath = path.join(root, folderName, "meta.json");
  try {
    const content = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(content) as StoredFeedback;
  } catch {
    return null;
  }
}

export async function readFeedbackDetail(folderName: string): Promise<StoredFeedback | null> {
  const root = resolveFeedbackRoot();
  const meta = await readFeedbackMeta(folderName);
  if (!meta) return null;

  const attachmentsDir = path.join(root, folderName, "attachments");
  let attachments: string[] = [];
  try {
    attachments = await fs.readdir(attachmentsDir);
  } catch {
    // no attachments directory
  }

  return { ...meta, attachments };
}

export async function updateFeedbackStatus(
  folderName: string,
  status: string,
): Promise<boolean> {
  const root = resolveFeedbackRoot();
  const metaPath = path.join(root, folderName, "meta.json");
  try {
    const content = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(content) as FeedbackMetadata;
    meta.status = status;
    await fs.writeFile(metaPath, JSON.stringify({ ...meta, folderName }, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function deleteFeedbackFolder(folderName: string): Promise<boolean> {
  const root = resolveFeedbackRoot();
  const feedbackDir = path.join(root, folderName);
  try {
    await fs.rm(feedbackDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function createComment(
  folderName: string,
  commentId: string,
  author: string,
  content: string,
): Promise<void> {
  const root = resolveFeedbackRoot();
  const commentsDir = path.join(root, folderName, "comments");
  await fs.mkdir(commentsDir, { recursive: true });

  const comment = {
    id: commentId,
    author,
    content,
    createdAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(commentsDir, `${commentId}.json`),
    JSON.stringify(comment, null, 2),
    "utf-8",
  );
}

export async function listComments(
  folderName: string,
): Promise<Array<{ id: string; author: string; content: string; createdAt: string }>> {
  const root = resolveFeedbackRoot();
  const commentsDir = path.join(root, folderName, "comments");
  try {
    const files = await fs.readdir(commentsDir);
    const comments = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const content = await fs.readFile(path.join(commentsDir, f), "utf-8");
          return JSON.parse(content) as { id: string; author: string; content: string; createdAt: string };
        }),
    );
    return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

function buildIssueMarkdown(meta: FeedbackMetadata): string {
  return `# ${meta.title}

- **Severity**: ${meta.severity}
- **Category**: ${meta.category}
- **Author**: ${meta.author}
- **Created**: ${meta.createdAt}
- **Status**: ${meta.status}

---

${meta.description}
`;
}
