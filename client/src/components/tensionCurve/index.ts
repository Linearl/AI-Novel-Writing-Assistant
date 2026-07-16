/**
 * General-purpose barrel export for tensionCurve components and utilities.
 */

export { default as TensionCurvePanel } from "./TensionCurvePanel";
export { default as TensionCurveFlowCanvas } from "./TensionCurveFlowCanvas";
export { default as TensionCurveNodes } from "./TensionCurveNodes";
export { default as TensionCurveEditDialog } from "./TensionCurveEditDialog";
export { default as TensionCurveBeatContextStrip } from "./TensionCurveBeatContextStrip";
export { default as TensionCurveChapterDetailSidebar } from "./TensionCurveChapterDetailSidebar";
export { default as TensionCurveVolumeContextBar } from "./TensionCurveVolumeContextBar";

export {
  computeCurveCoordinates,
  generateCurvePath,
  computeNodePosition,
  extractConflictValues,
  extractRevealValues,
  clampConflictValue,
  computeConflictFromDrag,
  COORDINATE_PADDING,
  NODE_SPACING_X,
} from "./curveCoordinates";

export {
  analyzeTensionCurve,
  sortIssuesBySeverity,
  getIssueSeverity,
  computeTensionStats,
} from "./tensionCurveAnalysis";

export type {
  CurvePoint,
  CurveBounds,
  TensionNodeData,
  CurveEdgeData,
  TensionIssue,
  TensionIssueCode,
  TensionIssueSeverity,
  TensionCurveSummary,
} from "./tensionCurveTypes";

export {
  TENSION_ISSUE_LABELS,
  TENSION_SEVERITY_COLORS,
  getConflictColor,
} from "./tensionCurveTypes";
