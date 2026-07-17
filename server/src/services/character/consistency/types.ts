/**
 * REQ-7056: Character consistency — type definitions.
 *
 * Defines the core interfaces for character state tracking,
 * contradiction detection, and consistency scoring.
 */

export interface AppearanceState {
  height?: string;
  build?: string;
  hair?: string;
  eyes?: string;
  skin?: string;
  distinguishingFeatures?: string[];
  clothing?: string;
  rawDescription: string;
}

export interface PersonalityState {
  traits: string[];
  motivations: string[];
  fears: string[];
  speechPattern?: string;
  rawDescription: string;
}

export interface AbilityState {
  name: string;
  level: string;
  limitations?: string[];
  sourceChapter: number;
}

export interface RelationshipState {
  targetCharacterId: string;
  targetCharacterName: string;
  type: string;
  trustLevel?: number;
  rawDescription: string;
}

export interface CharacterConsistencyStateRecord {
  id: string;
  novelId: string;
  characterId: string;
  chapterNumber: number;
  appearance: AppearanceState;
  personality: PersonalityState;
  abilities: AbilityState[];
  relationships: RelationshipState[];
  currentStatus: string | null;
  location: string | null;
  sourceChapter: number;
  createdAt: Date;
}

export type ContradictionType = "appearance" | "personality" | "ability" | "relationship" | "location";

export type ContradictionSeverity = "hard" | "soft";

export interface CharacterConsistencyContradiction {
  id: string;
  novelId: string;
  chapterNumber: number;
  characterId: string;
  characterName: string;
  type: ContradictionType;
  severity: ContradictionSeverity;
  description: string;
  existingState: string | null;
  newState: string | null;
  suggestion: string | null;
  confidence: number;
  resolved: boolean;
  resolvedNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsistencyScoreRecord {
  id: string;
  novelId: string;
  chapterNumber: number;
  overallScore: number;
  appearanceScore: number | null;
  personalityScore: number | null;
  abilityScore: number | null;
  relationshipScore: number | null;
  contradictionCount: number;
  hardCount: number;
  softCount: number;
  createdAt: Date;
}

export interface ConsistencyScoreBreakdown {
  chapterNumber: number;
  overall: number;
  dimensions: {
    appearance: number;
    personality: number;
    ability: number;
    relationship: number;
  };
  contradictions: CharacterConsistencyContradiction[];
}

export interface ContradictionFilter {
  characterId?: string;
  type?: ContradictionType;
  severity?: ContradictionSeverity;
  resolved?: boolean;
}

export interface ContradictionReport {
  novelId: string;
  chapterNumber: number;
  contradictions: CharacterConsistencyContradiction[];
  score: ConsistencyScoreBreakdown | null;
  generatedAt: string;
  summary: string;
}
