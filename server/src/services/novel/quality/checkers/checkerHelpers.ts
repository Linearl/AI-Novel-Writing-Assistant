/**
 * REQ-7051: Time reference utility helpers for consistency checkers.
 * Provides Chinese text time-parsing used by multiple checkers.
 */

// ── Location reference type (local definition) ──────────────────────

interface LocationReference {
  characterName?: string;
  place: string;
  paragraph: number;
  sceneTransition: boolean;
}

// ── Character behavior type (local definition) ─────────────────────

interface CharacterBehavior {
  characterName: string;
  actions: string[];
  emotion: string | null;
  description: string;
  paragraph: number;
}

// ── Time patterns ──────────────────────────────────────────────────────

export const TIME_PATTERNS: Record<string, RegExp> = {
  dayMarkers: /第[一二三四五六七八九十\d]+天|次日|翌日|当天|那天|今天|明天|昨天|三天前|两天前/g,
  timeOfDay: /早上|上午|中午|下午|傍晚|晚上|深夜|凌晨|黄昏|黎明|清晨|正午|午夜|午后|入夜/g,
  seasonMarkers: /春天|夏天|秋天|冬天|春季|夏季|秋季|冬季|初春|盛夏|深秋|隆冬|春末|夏初|秋末|冬初/g,
  relativeTime: /过了[一二三四五六七八九十\d]+天|几天后|半个月后|一个月后|一年后|数日后|片刻后|不久后|须臾|转眼/g,
  dateMarkers: /[一二三四五六七八九十\d]+月[一二三四五六七八九十\d]+[日号]|\d{1,2}\/\d{1,2}/g,
  intervalMarkers: /[一二三四五六七八九十\d]+[个]?小时|[一二三四五六七八九十\d]+[分]钟|[一二三四五六七八九十\d]+天/g,
};

// ── Location patterns ──────────────────────────────────────────────────

export const LOCATION_PATTERNS: Record<string, RegExp> = {
  rooms: /房间|卧室|客厅|厨房|书房|浴室|办公室|教室|会议室|密室|地下室|阁楼/g,
  buildings: /大楼|大厦|别墅|公寓|酒店|医院|学校|公司|宫殿|城堡|寺庙|道观/g,
  outdoor: /街道|广场|公园|花园|森林|山上|河边|海边|湖边|野外|郊外|集市|码头/g,
  transition: /来到|到达|抵达|走到|进入|离开|走出|返回|前往|赶往|回到|归来/g,
  directions: /东|南|西|北|左|右|前|后|上|下/g,
};

// ── Emotion patterns ───────────────────────────────────────────────────

export const EMOTION_KEYWORDS: Record<string, string[]> = {
  positive: [
    "高兴", "开心", "喜悦", "兴奋", "满意", "欣慰", "感动", "温暖",
    "得意", "自信", "骄傲", "欣喜", "欢快", "愉快", "轻松", "感激",
  ],
  negative: [
    "愤怒", "悲伤", "恐惧", "焦虑", "沮丧", "失望", "痛苦", "厌恶",
    "嫉妒", "羞耻", "愧疚", "绝望", "烦躁", "冷漠", "阴沉", "恼火",
  ],
  neutral: [
    "平静", "淡然", "镇定", "冷静", "沉默", "沉思", "茫然", "疑惑",
  ],
  intense: [
    "暴怒", "狂喜", "痛哭", "崩溃", "疯狂", "颤抖", "嘶吼", "咆哮",
  ],
};

// ── Character action patterns ──────────────────────────────────────────

const ACTION_VERBS = [
  "说道", "喊道", "走出", "坐下", "站起", "拿出", "收起", "拔出",
  "攻击", "逃跑", "抱住", "推开", "握住", "放开", "点头", "摇头",
  "微笑", "冷笑", "苦笑", "大笑", "瞪眼", "闭眼", "叹气", "啜泣",
];

// ── Export helpers ─────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

export function normalizeChineseTime(text: string, type: string): number {
  if (type === "dayMarkers") {
    const match = text.match(/[一二三四五六七八九十\d]+/);
    if (!match) return 0;
    const raw = match[0];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    if (DAY_MAP[raw]) return DAY_MAP[raw];
    return raw.length > 1 ? 999 : 0;
  }
  if (type === "timeOfDay") {
    const order = [
      "凌晨", "清晨", "早上", "上午", "中午", "午后",
      "下午", "傍晚", "黄昏", "入夜", "晚上", "深夜", "午夜",
    ];
    const idx = order.findIndex((t) => text.includes(t));
    return idx >= 0 ? idx : 0;
  }
  if (type === "seasonMarkers") {
    const order = ["初春", "春天", "春季", "春末", "夏初", "夏天", "夏季", "盛夏", "秋末", "秋天", "秋季", "深秋", "冬初", "冬天", "冬季", "隆冬"];
    const idx = order.findIndex((t) => text.includes(t));
    return idx >= 0 ? idx : 0;
  }
  if (type === "relativeTime") {
    const match = text.match(/[一二三四五六七八九十\d]+/);
    if (!match) return 1;
    const raw = match[0];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    return DAY_MAP[raw] || 1;
  }
  if (type === "dateMarkers") {
    const match = text.match(/([一二三四五六七八九十\d]+)月/);
    if (!match) return 0;
    const raw = match[1];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10) * 100;
    return (DAY_MAP[raw] || 1) * 100;
  }
  return 0;
}

export function normalizeNumber(text: string): number {
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  return DAY_MAP[text] || 0;
}

// ── Location extraction ────────────────────────────────────────────────

export function extractLocations(content: string, characterNames: string[]): LocationReference[] {
  const refs: LocationReference[] = [];
  const paragraphs = content.split(/\n\n+/);

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const foundPlaces: string[] = [];

    for (const [, pattern] of Object.entries(LOCATION_PATTERNS)) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(para)) !== null) {
        foundPlaces.push(match[0]);
      }
    }

    if (foundPlaces.length > 0) {
      // Assign to nearest character
      const assignedChar = findNearestCharacter(para, characterNames);
      const hasTransition = LOCATION_PATTERNS.transition.test(para);
      refs.push({
        characterName: assignedChar ?? undefined,
        place: foundPlaces.join(" → "),
        paragraph: i,
        sceneTransition: hasTransition,
      });
    }
  }

  return refs;
}

// ── Behavior extraction ────────────────────────────────────────────────

export function extractBehaviors(
  content: string,
  characters: Array<{ name: string; personality?: string; background?: string }>,
): CharacterBehavior[] {
  const behaviors: CharacterBehavior[] = [];
  const paragraphs = content.split(/\n\n+/);

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    for (const char of characters) {
      if (!para.includes(char.name)) continue;

      // Extract actions
      const actions = ACTION_VERBS
        .filter((verb) => {
          const idx = para.indexOf(char.name);
          const verbIdx = para.indexOf(verb);
          return verbIdx > idx && verbIdx - idx < 80;
        })
        .slice(0, 5);

      if (actions.length === 0) continue;

      // Extract emotion
      let emotion: string | null = null;
      for (const [category, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        for (const kw of keywords) {
          if (para.includes(kw)) {
            emotion = kw;
            break;
          }
        }
        if (emotion) break;
      }

      behaviors.push({
        characterName: char.name,
        actions,
        emotion,
        description: `${char.name}: ${actions.join("、")}${emotion ? `（${emotion}）` : ""}`,
        paragraph: i,
      });
    }
  }

  return behaviors;
}

// ── Helpers ────────────────────────────────────────────────────────────

function findNearestCharacter(
  paragraph: string,
  characterNames: string[],
): string | null {
  let closest: string | null = null;
  let closestDist = Infinity;

  for (const name of characterNames) {
    const idx = paragraph.indexOf(name);
    if (idx !== -1 && idx < closestDist) {
      closest = name;
      closestDist = idx;
    }
  }

  return closest;
}

export function getParagraphIndex(content: string, position: number): number {
  const before = content.slice(0, position);
  return before.split(/\n\n+/).length - 1;
}

export function isReasonableTransition(from: string, to: string): boolean {
  // Same location
  if (from === to) return true;
  // Adjacent rooms in same building
  const buildingScopes = ["房间", "卧室", "客厅", "厨房", "浴室", "书房"];
  if (buildingScopes.includes(from) && buildingScopes.includes(to)) return true;
  // Same city
  const sameCityWords = ["东", "南", "西", "北", "城", "区"];
  if (sameCityWords.some((w) => from.includes(w) || to.includes(w))) {
    return true;
  }
  return false;
}

export function isEmotionConflict(prev: string, curr: string): boolean {
  const positive = EMOTION_KEYWORDS.positive;
  const negative = EMOTION_KEYWORDS.negative;

  const prevPos = positive.includes(prev);
  const prevNeg = negative.includes(prev);
  const currPos = positive.includes(curr);
  const currNeg = negative.includes(curr);

  // Extreme emotion shift: positive → negative or negative → positive
  return (prevPos && currNeg) || (prevNeg && currPos);
}

export function getKnownLocations(): Set<string> {
  return new Set([
    ...Object.values(LOCATION_PATTERNS).flatMap((p) => {
      const matches: string[] = [];
      const regex = new RegExp(p.source, p.flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec("")) !== null) {
        matches.push(m[0]);
      }
      return matches;
    }),
  ]);
}
