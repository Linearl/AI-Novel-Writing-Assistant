/**
 * Generic text extraction utilities.
 *
 * Moved from services/novel/novelP0Utils.ts (ARCH-005) because `toText` is a
 * pure platform-level helper unrelated to novel domain logic.
 */

export function toText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
        return item.text;
      }
      return "";
    }).join("");
  }
  return JSON.stringify(content ?? "");
}
