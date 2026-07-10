/**
 * PromptDefinition — YAML prompt 文件的解析结果结构。
 */

export interface PromptDefinition {
  /** 唯一标识，格式: "category.name"，映射到 category-name.yaml */
  id: string;
  /** 版本号，用于缓存失效 */
  version: string;
  /** 系统提示词文本 */
  system: string;
  /** 用户提示词模板（可选，支持 {varName} 占位符） */
  user?: string;
  /** 模板变量名列表 */
  variables: string[];
}
