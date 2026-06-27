export interface LoopDetectionResult {
  isLoop: boolean;
  truncationIndex: number;
  repeatedSegment: string;
  tokenEstimate: number;
}

export interface StreamingRepetitionDetectorConfig {
  enabled: boolean;
  windowSize: number;
  ngramSize: number;
  repetitionThreshold: number;
  consecutiveHitCount: number;
  minValidContentLength: number;
}

const DEFAULT_CONFIG: StreamingRepetitionDetectorConfig = {
  enabled: true,
  windowSize: 20,
  ngramSize: 50,
  repetitionThreshold: 0.7,
  consecutiveHitCount: 5,
  minValidContentLength: 500,
};

export function loadLoopDetectorConfig(): StreamingRepetitionDetectorConfig {
  return {
    enabled: process.env.LOOP_DETECTOR_ENABLED !== "false",
    windowSize: Number(process.env.LOOP_DETECTOR_WINDOW_SIZE) || DEFAULT_CONFIG.windowSize,
    ngramSize: Number(process.env.LOOP_DETECTOR_NGRAM_SIZE) || DEFAULT_CONFIG.ngramSize,
    repetitionThreshold: Number(process.env.LOOP_DETECTOR_REPETITION_THRESHOLD) || DEFAULT_CONFIG.repetitionThreshold,
    consecutiveHitCount: Number(process.env.LOOP_DETECTOR_CONSECUTIVE_HIT_COUNT) || DEFAULT_CONFIG.consecutiveHitCount,
    minValidContentLength: Number(process.env.LOOP_DETECTOR_MIN_VALID_CONTENT_LENGTH) || DEFAULT_CONFIG.minValidContentLength,
  };
}

export class StreamingRepetitionDetector {
  private chunks: string[] = [];
  private consecutiveHits = 0;
  private fullText = "";
  private config: StreamingRepetitionDetectorConfig;

  constructor(config: StreamingRepetitionDetectorConfig) {
    this.config = config;
  }

  feed(chunk: string): LoopDetectionResult | null {
    if (!this.config.enabled) return null;

    this.chunks.push(chunk);
    this.fullText += chunk;

    if (this.chunks.length < this.config.windowSize) return null;

    const windowText = this.chunks.slice(-this.config.windowSize).join("");
    const rate = this.computeRepetitionRate(windowText);

    if (rate >= this.config.repetitionThreshold) {
      this.consecutiveHits += 1;
    } else {
      this.consecutiveHits = 0;
    }

    if (this.consecutiveHits < this.config.consecutiveHitCount) return null;

    // Loop detected
    const loopStartIndex = this.findLoopStartIndex();
    const truncationIndex = this.findSafeTruncationPoint(this.fullText, loopStartIndex);

    if (truncationIndex < this.config.minValidContentLength) {
      return {
        isLoop: true,
        truncationIndex: 0,
        repeatedSegment: this.fullText.slice(Math.max(0, loopStartIndex - 200)),
        tokenEstimate: this.estimateTokens(this.fullText),
      };
    }

    return {
      isLoop: true,
      truncationIndex,
      repeatedSegment: this.fullText.slice(loopStartIndex, loopStartIndex + 200),
      tokenEstimate: this.estimateTokens(this.fullText),
    };
  }

  private computeRepetitionRate(text: string): number {
    const ngramSize = this.config.ngramSize;
    if (text.length < ngramSize * 2) return 0;
    const ngrams: string[] = [];
    for (let i = 0; i <= text.length - ngramSize; i++) {
      ngrams.push(text.slice(i, i + ngramSize));
    }
    if (ngrams.length === 0) return 0;
    const unique = new Set(ngrams);
    return 1 - unique.size / ngrams.length;
  }

  private findLoopStartIndex(): number {
    const windowChunks = this.chunks.slice(-this.config.windowSize);
    const windowText = windowChunks.join("");
    const lastChunk = windowChunks[windowChunks.length - 1];
    if (!lastChunk) return Math.max(0, this.fullText.length - 500);

    const lastChunkIndex = this.fullText.lastIndexOf(lastChunk);
    const searchStart = Math.max(0, lastChunkIndex - windowText.length * 2);

    const lastChunkTrimmed = lastChunk.slice(0, Math.min(100, lastChunk.length));
    let candidate = this.fullText.lastIndexOf(lastChunkTrimmed, lastChunkIndex - 1);
    if (candidate < searchStart) {
      candidate = searchStart;
    }
    return candidate;
  }

  private findSafeTruncationPoint(text: string, index: number): number {
    const searchStart = Math.max(0, index - 500);
    const segment = text.slice(searchStart, index);
    const paragraphBreak = segment.lastIndexOf("\n\n");
    if (paragraphBreak >= 0) {
      return searchStart + paragraphBreak + 2;
    }
    const lineBreak = segment.lastIndexOf("\n");
    if (lineBreak >= 0) {
      return searchStart + lineBreak + 1;
    }
    return Math.max(0, index);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  reset(): void {
    this.chunks = [];
    this.consecutiveHits = 0;
    this.fullText = "";
  }
}
