/**
 * renderer — {variable} 占位符替换引擎。
 *
 * 仅做简单正则替换，不引入模板引擎依赖。
 * 未匹配的变量保持原样 {varName}，便于调试。
 */

export function renderPrompt(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}
