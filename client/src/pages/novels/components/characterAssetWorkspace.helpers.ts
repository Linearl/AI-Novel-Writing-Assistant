import type { Character, CharacterCastRole, CharacterGender, CharacterTier } from "@ai-novel/shared";

const CAST_ROLE_LABELS: Record<CharacterCastRole, string> = {
  protagonist: "主角",
  antagonist: "主对手",
  ally: "同盟",
  foil: "镜像角色",
  mentor: "导师",
  love_interest: "情感牵引",
  pressure_source: "压力源",
  catalyst: "催化者",
};

const CHARACTER_GENDER_LABELS: Record<CharacterGender, string> = {
  male: "男",
  female: "女",
  other: "其他",
  unknown: "未知",
};

export function getCastRoleLabel(castRole?: CharacterCastRole | null): string {
  if (!castRole) {
    return "未定义";
  }
  return CAST_ROLE_LABELS[castRole] ?? castRole;
}

export function getCharacterGenderLabel(gender?: CharacterGender | null): string {
  if (!gender) {
    return "未知";
  }
  return CHARACTER_GENDER_LABELS[gender] ?? gender;
}

export function isProtagonistCharacter(character?: Character | null): boolean {
  if (!character) {
    return false;
  }
  if (character.castRole === "protagonist") {
    return true;
  }
  const roleText = `${character.role ?? ""} ${character.castRole ?? ""}`;
  return /(?<!女)主角|(?<!公)主人公|^男主/.test(roleText);
}

const CHARACTER_TIER_LABELS: Record<CharacterTier, string> = {
  lead: "主角",
  major: "重要配角",
  named: "有名角色",
  extra: "次要角色",
};

const CHARACTER_TIER_COLORS: Record<CharacterTier, string> = {
  lead: "#1677ff",
  major: "#52c41a",
  named: "#8c8c8c",
  extra: "#d9d9d9",
};

export function getCharacterTierLabel(tier?: CharacterTier | null): string {
  if (!tier) {
    return "有名角色";
  }
  return CHARACTER_TIER_LABELS[tier] ?? tier;
}

export function getCharacterTierColor(tier?: CharacterTier | null): string {
  if (!tier) {
    return CHARACTER_TIER_COLORS.named;
  }
  return CHARACTER_TIER_COLORS[tier] ?? CHARACTER_TIER_COLORS.named;
}
