/**
 * Character arc visualization types (REQ-2032).
 * Shared between server HTTP responses and client components.
 */

export interface CharacterArcTimelineEvent {
  chapterOrder: number | null;
  title: string;
  event: string;
}

export interface CharacterArcData {
  characterId: string;
  name: string;
  role: string;
  arc: {
    arcStart: string | null;
    arcMidpoint: string | null;
    arcClimax: string | null;
    arcEnd: string | null;
  };
  currentState: string | null;
  currentGoal: string | null;
  timeline: CharacterArcTimelineEvent[];
}

export interface CharacterRelationStageEntry {
  stageLabel: string;
  stageSummary: string;
  chapterOrder: number | null;
  trustScore: number | null;
  conflictScore: number | null;
  intimacyScore: number | null;
  dependencyScore: number | null;
  sourceType: string;
  isCurrent: boolean;
  nextTurnPoint: string | null;
}

export interface CharacterRelationEvolutionData {
  characterA: string;
  characterB: string;
  stageCount: number;
  stages: CharacterRelationStageEntry[];
}

export interface CharacterStatesByChapterEntry {
  chapterOrder: number | null;
  chapterTitle: string | null;
  emotion: string | null;
  stressLevel: number | null;
  currentGoal: string | null;
  summary: string | null;
}

export interface CharacterStatesByChapterData {
  characterId: string;
  name: string;
  stateCount: number;
  states: CharacterStatesByChapterEntry[];
}
