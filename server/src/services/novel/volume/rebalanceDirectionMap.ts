/**
 * Shared rebalance direction alias mapping.
 * Used by volumeGenerationSchemas.ts and volumeWorkspaceDocument.ts.
 */

import type { VolumeRebalanceDecision } from "@ai-novel/shared";

const REBALANCE_DIRECTION_ALIASES: Record<string, VolumeRebalanceDecision["direction"]> = {
  pull_forward: "pull_forward",
  pullforward: "pull_forward",
  backward: "pull_forward",
  back: "pull_forward",
  push_back: "push_back",
  pushback: "push_back",
  forward: "push_back",
  next: "push_back",
  tighten_current: "tighten_current",
  tighten: "tighten_current",
  compress_current: "tighten_current",
  expand_adjacent: "expand_adjacent",
  expand: "expand_adjacent",
  expand_neighbor: "expand_adjacent",
  expand_neighbour: "expand_adjacent",
  adjacent: "expand_adjacent",
  hold: "hold",
  no_change: "hold",
  none: "hold",
  stable: "hold",
};

export function resolveRebalanceDirection(normalized: string): VolumeRebalanceDecision["direction"] | undefined {
  return REBALANCE_DIRECTION_ALIASES[normalized];
}
