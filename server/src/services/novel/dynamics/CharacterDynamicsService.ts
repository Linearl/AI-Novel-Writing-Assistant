import type { IDatabase } from "../../../platform/di";
import { prisma } from "../../../db/prisma";
import { CharacterDynamicsMutationService } from "./CharacterDynamicsMutationService";
import { CharacterDynamicsQueryService } from "./CharacterDynamicsQueryService";

export class CharacterDynamicsService {
  private readonly queryService: CharacterDynamicsQueryService;
  private readonly mutationService: CharacterDynamicsMutationService;

  constructor(
    db: IDatabase = prisma,
  ) {
    this.queryService = new CharacterDynamicsQueryService(db);
    this.mutationService = new CharacterDynamicsMutationService(this.queryService, db);
  }

  getOverview(...args: Parameters<CharacterDynamicsQueryService["getOverview"]>) {
    return this.queryService.getOverview(...args);
  }

  buildContextDigest(...args: Parameters<CharacterDynamicsQueryService["buildContextDigest"]>) {
    return this.queryService.buildContextDigest(...args);
  }

  formatContextDigest(...args: Parameters<CharacterDynamicsQueryService["formatContextDigest"]>) {
    return this.queryService.formatContextDigest(...args);
  }

  listCandidates(...args: Parameters<CharacterDynamicsQueryService["listCandidates"]>) {
    return this.queryService.listCandidates(...args);
  }

  confirmCandidate(...args: Parameters<CharacterDynamicsMutationService["confirmCandidate"]>) {
    return this.mutationService.confirmCandidate(...args);
  }

  mergeCandidate(...args: Parameters<CharacterDynamicsMutationService["mergeCandidate"]>) {
    return this.mutationService.mergeCandidate(...args);
  }

  updateCharacterDynamicState(...args: Parameters<CharacterDynamicsMutationService["updateCharacterDynamicState"]>) {
    return this.mutationService.updateCharacterDynamicState(...args);
  }

  updateRelationStage(...args: Parameters<CharacterDynamicsMutationService["updateRelationStage"]>) {
    return this.mutationService.updateRelationStage(...args);
  }

  rebuildDynamics(...args: Parameters<CharacterDynamicsMutationService["rebuildDynamics"]>) {
    return this.mutationService.rebuildDynamics(...args);
  }

  syncChapterDraftDynamics(...args: Parameters<CharacterDynamicsMutationService["syncChapterDraftDynamics"]>) {
    return this.mutationService.syncChapterDraftDynamics(...args);
  }
}

export const characterDynamicsService = new CharacterDynamicsService();
