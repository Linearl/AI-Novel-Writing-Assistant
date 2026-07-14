/**
 * issueGenerator.ts
 *
 * REQ-3019: AI Issue 生成逻辑。
 * 调用 LLM 将用户反馈 + 上下文转化为结构化 Issue Markdown，
 * 并保存到 storage/feedback/ 备查。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { invokeStructuredLlm } from "../../llm/structuredInvoke";
import { issueGenerationPrompt, type IssueGenerationOutput } from "../../prompting/prompts/feedback/issueGeneration.prompts";
import { resolveServerRoot } from "../../runtime/appPaths";
import { logger } from "../../services/logging/LoggerService";

interface GenerateIssueInput {
  description: string;
  contextJson: string;
  images?: Array<{ fileName: string; base64: string }>;
}

interface GenerateIssueResult {
  title: string;
  body: string;
  labels: string[];
  savedPath?: string;
}

/**
 * 将 Issue 输出组装为完整 Markdown 文本。
 */
function buildIssueMarkdown(output: IssueGenerationOutput): string {
  const labelLine = output.labels.length > 0
    ? `Labels: ${output.labels.join(", ")}`
    : "";

  return `# ${output.title}

${labelLine ? labelLine + "\n\n" : ""}${output.body}
`;
}

/**
 * 保存生成的 Issue 到 storage/feedback/ 备查。
 */
async function saveGeneratedIssue(
  folderName: string,
  markdown: string,
): Promise<string> {
  const root = path.join(resolveServerRoot(), "storage", "feedback");
  const issueDir = path.join(root, folderName);
  await fs.mkdir(issueDir, { recursive: true });

  const filePath = path.join(issueDir, "generated-issue.md");
  await fs.writeFile(filePath, markdown, "utf-8");
  return filePath;
}

/**
 * 调用 LLM 生成结构化 Issue。
 */
export async function generateIssue(input: GenerateIssueInput): Promise<GenerateIssueResult> {
  const messages = issueGenerationPrompt.render(
    { description: input.description, contextJson: input.contextJson },
    {
      blocks: [],
      selectedBlockIds: [],
      droppedBlockIds: [],
      summarizedBlockIds: [],
      estimatedInputTokens: 0,
    },
  );

  const output = await invokeStructuredLlm<IssueGenerationOutput>({
    messages,
    schema: issueGenerationPrompt.outputSchema!,
    label: "feedback.issue.generation",
    temperature: 0.3,
    maxTokens: 4096,
  });

  const markdown = buildIssueMarkdown(output);

  // Save to storage (non-blocking on failure)
  const folderName = `generated_${Date.now()}`;
  try {
    const savedPath = await saveGeneratedIssue(folderName, markdown);
    return { ...output, savedPath };
  } catch (error) {
    logger.error("[feedback] failed to save generated issue", error);
    return { ...output };
  }
}
