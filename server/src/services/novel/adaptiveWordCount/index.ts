export {
  calculateWordCountTarget,
  calculateWordCountTargets,
  detectWordCountAdjustment,
} from "./wordCountCalculator";

export {
  checkWordCount,
  runWordCountAdjustmentLoop,
  measureWordCount,
  type WordCountCheckResult,
} from "./wordCountCheckService";

export {
  detectWaterContent,
  applyWaterContentThreshold,
  type WaterContentDetectionInput,
  type WaterContentDetectionResult,
} from "./waterContentDetectionService";
