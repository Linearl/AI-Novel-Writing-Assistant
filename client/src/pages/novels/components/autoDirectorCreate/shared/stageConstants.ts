/**
 * REQ-3022: Shared stage constants for AutoDirector create flows.
 *
 * Extracted from autoDirectorCreate/StageModelRun.tsx to allow reuse
 * across page-level (autoDirector/) and dialog-level (autoDirectorCreate/) stages.
 */
import type { DirectorRunMode } from "@ai-novel/shared/types/novelDirector";

export interface RunModeOption {
  value: DirectorRunMode;
  label: string;
  description: string;
  recommended?: boolean;
  recommendation?: string;
}

export const RUN_MODE_OPTIONS: RunModeOption[] = [
  {
    value: "full_book_autopilot",
    label: "全书自动成书",
    description: "你只在开始选择方向，系统会按整本书目标完成规划、写作、审校和修复。",
  },
  {
    value: "auto_to_ready",
    label: "先准备到可开写（推荐）",
    description: "AI 会先准备书级规划、卷章安排和章节执行资源，停在可开写阶段交给你确认。",
    recommended: true,
    recommendation: "推荐先查看规划是否符合想法，再开始大量章节产出。",
  },
  {
    value: "auto_to_execution",
    label: "按范围执行",
    description: "可选择全书、前 N 章或前 1 卷，让 AI 直接准备并执行目标范围。",
  },
];
