import type { BookAnalysisCharacterAppearanceTerm } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";

const TERM_NORMALIZATION_MAP: Record<string, Record<string, string>> = {
  hair: {
    "黑色头发": "黑发",
    "白发": "白发",
    "银发": "银发",
    "金发": "金发",
    "红发": "红发",
    "棕发": "棕发",
    "灰白": "花白发",
    "斑白": "花白发",
    "花白": "花白发",
    "长发": "长发",
    "短发": "短发",
    "披肩发": "披肩发",
    "马尾": "马尾",
    "发髻": "发髻",
    "盘发": "盘发",
    "散发": "散发",
    "披散": "披发",
    "束发": "束发",
    "直发": "直发",
    "卷发": "卷发",
    "波浪": "波浪卷",
  },
  eyes: {
    "黑眸": "黑瞳",
    "黑眼": "黑瞳",
    "墨色": "黑瞳",
    "蓝眸": "蓝瞳",
    "蓝眼": "蓝瞳",
    "金瞳": "金瞳",
    "金眼": "金瞳",
    "红瞳": "红瞳",
    "红眼": "赤瞳",
    "绿眸": "绿瞳",
    "绿眼": "绿瞳",
    "深邃": "深瞳",
    "明亮": "亮瞳",
    "清澈": "清瞳",
    "锐利": "锐目",
    "凤眼": "凤眼",
    "桃花眼": "桃花眼",
    "丹凤眼": "丹凤眼",
    "杏眼": "杏眼",
  },
  body: {
    "修长": "修长",
    "高挑": "高挑",
    "娇小": "娇小",
    "魁梧": "魁梧",
    "瘦削": "瘦削",
    "纤细": "纤瘦",
    "丰满": "丰满",
    "匀称": "匀称",
    "挺拔": "挺拔",
    "臃肿": "臃肿",
    "单薄": "单薄",
    "结实": "结实",
    "壮硕": "壮硕",
    "精壮": "精壮",
  },
  clothing: {
    "长袍": "长袍",
    "白袍": "白袍",
    "青衫": "青衫",
    "黑衣": "黑衣",
    "白衣": "白衣",
    "锦袍": "锦袍",
    "道袍": "道袍",
    "宫装": "宫装",
    "铠甲": "铠甲",
    "战袍": "战袍",
    "劲装": "劲装",
    "便服": "便衣",
    "素衣": "素衣",
    "华服": "华服",
    "铠": "铠甲",
    "披风": "披风",
  },
};

export class BookAnalysisCharacterAppearanceTermService {
  async listTerms(characterId: string): Promise<BookAnalysisCharacterAppearanceTerm[]> {
    const rows = await prisma.bookAnalysisCharacterAppearanceTerm.findMany({
      where: { characterId },
      orderBy: [{ termCategory: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async addTerm(characterId: string, termCategory: string, termOriginal: string): Promise<BookAnalysisCharacterAppearanceTerm> {
    const termStandard = this.normalizeTerm(termCategory, termOriginal);
    const existing = await prisma.bookAnalysisCharacterAppearanceTerm.findFirst({
      where: { characterId, termCategory, termOriginal },
    });
    if (existing) {
      const row = await prisma.bookAnalysisCharacterAppearanceTerm.update({
        where: { id: existing.id },
        data: { termStandard },
      });
      return { ...row, createdAt: row.createdAt.toISOString() };
    }
    const row = await prisma.bookAnalysisCharacterAppearanceTerm.create({
      data: { characterId, termCategory, termOriginal, termStandard },
    });
    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async deleteTerm(termId: string) {
    const term = await prisma.bookAnalysisCharacterAppearanceTerm.findUnique({
      where: { id: termId },
    });
    if (!term) {
      throw new AppError("Appearance term not found.", 404);
    }
    await prisma.bookAnalysisCharacterAppearanceTerm.delete({ where: { id: termId } });
  }

  async getStandardTerms(characterId: string): Promise<Record<string, string[]>> {
    const terms = await this.listTerms(characterId);
    const grouped: Record<string, string[]> = {};
    for (const term of terms) {
      if (!grouped[term.termCategory]) {
        grouped[term.termCategory] = [];
      }
      grouped[term.termCategory].push(term.termStandard);
    }
    return grouped;
  }

  normalizeTerm(termCategory: string, original: string): string {
    const normalized = original.trim();
    const categoryMap = TERM_NORMALIZATION_MAP[termCategory];
    if (categoryMap && categoryMap[normalized]) {
      return categoryMap[normalized];
    }
    for (const [key, value] of Object.entries(categoryMap ?? {})) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    return normalized.length > 10 ? normalized.slice(0, 10) : normalized;
  }
}
