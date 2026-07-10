/**
 * Prompt 模板引擎 — facade。
 *
 * 从 server/src/prompts/ 目录下的 YAML 文件加载 prompt，
 * 支持 {variable} 占位符渲染。
 *
 * 与 server/src/prompting/ PromptAsset 系统共存，互不干扰。
 */

export { loadPrompt, clearPromptCache } from "./loader";
export { renderPrompt } from "./renderer";
export type { PromptDefinition } from "./types";
