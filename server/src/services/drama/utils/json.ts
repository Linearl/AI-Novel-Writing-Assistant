export { safeParseJSON, safeJsonParse } from "../../../platform/json";

export function compactText(value: string | null | undefined, max = 800): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
