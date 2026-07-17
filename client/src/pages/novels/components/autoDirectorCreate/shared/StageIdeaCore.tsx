/**
 * REQ-3022: Shared Core for StageIdea - extracts the common idea input +
 * inspiration panel + continue/quick-generate action logic.
 *
 * Used by:
 * - autoDirector/StageIdea.tsx (fullscreen layout)
 * - autoDirectorCreate/StageIdea.tsx (compact layout)
 */
import type { ReactNode } from "react";
import type { DirectorIdeaInspiration } from "@ai-novel/shared/types/novelDirector";
import NovelAutoDirectorIdeaInspirationPanel from "../../NovelAutoDirectorIdeaInspirationPanel";

export interface StageIdeaCoreProps {
  idea: string;
  onIdeaChange: (value: string) => void;
  ideaInspirations: DirectorIdeaInspiration[];
  isGeneratingIdeaInspirations: boolean;
  onGenerateIdeaInspirations: () => void;
  onUseIdea: (text: string) => void;
  canContinue: boolean;
  isGenerating: boolean;
  onContinue: () => void;
  onQuickGenerate: () => void;
  /** Optional confirm dialog rendered by the wrapper (fullscreen variant uses useConfirm). */
  confirmDialog?: ReactNode;
}

export interface StageIdeaCoreRenderSlots {
  /** Wrapper for the idea input area (textarea + actions). */
  ideaInputWrapper: (children: ReactNode) => ReactNode;
  /** Wrapper for the inspiration panel. */
  inspirationWrapper: (children: ReactNode) => ReactNode;
}

/**
 * Renders the shared inspiration panel. Wrappers provide layout-specific
 * containers and animations around it.
 */
export function renderIdeaInspirationPanel(props: StageIdeaCoreProps): ReactNode {
  if (props.ideaInspirations.length === 0 && !props.isGeneratingIdeaInspirations) {
    return null;
  }
  return (
    <NovelAutoDirectorIdeaInspirationPanel
      ideas={props.ideaInspirations}
      isGenerating={props.isGeneratingIdeaInspirations}
      onGenerate={props.onGenerateIdeaInspirations}
      onUseIdea={props.onUseIdea}
    />
  );
}

/**
 * Shared placeholder text for the idea textarea.
 */
export const IDEA_PLACEHOLDER = "例如：普通女大学生误入异能组织，一边上学打工，一边调查父亲失踪真相。";
