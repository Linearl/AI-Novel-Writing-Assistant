/**
 * REQ-7048: Quality checker shared type definitions.
 */

export interface QualityIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  location?: { paragraph: number; offset: number };
}

export interface QualityDimension {
  name: string;
  score: number; // 0-100
  passed: boolean;
  issues: QualityIssue[];
}

export interface QualityReport {
  chapterId: string;
  novelId: string;
  overallScore: number; // 0-100
  passed: boolean;
  dimensions: QualityDimension[];
  summary: string;
  checkedAt: string;
}

export interface QualityCheckConfig {
  wordCount: {
    enabled: boolean;
    min: number;
    max: number;
  };
  structure: {
    enabled: boolean;
    minParagraphs: number;
    maxDialogueRatio: number;
  };
  character: {
    enabled: boolean;
  };
  plotCoherence: {
    enabled: boolean;
    timeJumpThreshold: number;
  };
  aiSmell: {
    enabled: boolean;
    threshold: number;
  };
  enabledCheckers: string[];
}

export const DEFAULT_QUALITY_CONFIG: QualityCheckConfig = {
  wordCount: {
    enabled: true,
    min: 3000,
    max: 8000,
  },
  structure: {
    enabled: true,
    minParagraphs: 5,
    maxDialogueRatio: 0.7,
  },
  character: {
    enabled: true,
  },
  plotCoherence: {
    enabled: true,
    timeJumpThreshold: 2,
  },
  aiSmell: {
    enabled: false, // disabled until REQ-7050 is ready
    threshold: 60,
  },
  enabledCheckers: ["wordCount", "structure", "character", "plotCoherence"],
};

export interface QualityDimensionChecker {
  name: string;
  check(content: string, chapterId: string, novelId: string, config: QualityCheckConfig): Promise<QualityDimension>;
}
