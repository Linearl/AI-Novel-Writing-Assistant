import * as React from "react";
import { useCallback } from "react";
import { BatchPolishButton } from "./BatchPolishButton";
import { BatchPolishProgress } from "./BatchPolishProgress";
import { DetectionResultDisplay, PolishResultDisplay } from "./BatchPolishResult";
import { useBatchPolish, type BatchPolishPhase } from "./hooks/useBatchPolish";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BatchPolishContainerProps {
  novelId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BatchPolishContainer({ novelId }: BatchPolishContainerProps) {
  const {
    phase,
    detectionResult,
    jobProgress,
    error,
    startDetection,
    startPolish,
    cancelJob,
    reset,
  } = useBatchPolish({ novelId });

  const handleButtonClick = useCallback(() => {
    void startDetection();
  }, [startDetection]);

  const handlePolish = useCallback(() => {
    void startPolish();
  }, [startPolish]);

  const handleCancel = useCallback(() => {
    void cancelJob();
  }, [cancelJob]);

  return (
    <div className="space-y-4">
      {/* Trigger button — visible in idle, error, or after results shown */}
      <PhaseGate phase={phase}>
        <Phase name="idle">
          <BatchPolishButton
            onClick={handleButtonClick}
            loading={false}
          />
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </Phase>

        <Phase name="detecting">
          <BatchPolishButton
            onClick={() => {}}
            loading
            disabled
          />
        </Phase>

        <Phase name="polishing">
          {jobProgress && (
            <BatchPolishProgress
              progress={jobProgress}
              onCancel={handleCancel}
            />
          )}
        </Phase>

        <Phase name="done">
          {jobProgress && (
            <PolishResultDisplay
              progress={jobProgress}
              onReset={reset}
            />
          )}
        </Phase>

        <Phase name="cancelled">
          {jobProgress && (
            <PolishResultDisplay
              progress={jobProgress}
              onReset={reset}
            />
          )}
        </Phase>

        <Phase name="error">
          <BatchPolishButton
            onClick={handleButtonClick}
            loading={false}
          />
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </Phase>
      </PhaseGate>

      {/* Show detection result when available and not actively polishing */}
      {detectionResult && phase !== "detecting" && phase !== "polishing" && (
        <DetectionResultDisplay
          result={detectionResult}
          onPolish={handlePolish}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhaseGate: simple conditional rendering helper
// ---------------------------------------------------------------------------

interface PhaseGateProps {
  phase: BatchPolishPhase;
  children: React.ReactNode;
}

function PhaseGate({ phase, children }: PhaseGateProps) {
  // PhaseGate renders only the Phase child whose `name` matches the current phase
  return (
    <>
      {React.Children.toArray(children).filter(
        (child) =>
          React.isValidElement(child)
          && child.type === Phase
          && (child.props as PhaseProps).name === phase,
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Phase: named slot child
// ---------------------------------------------------------------------------

interface PhaseProps {
  name: BatchPolishPhase;
  children: React.ReactNode;
}

function Phase({ children }: PhaseProps) {
  return <>{children}</>;
}

// Re-export all public APIs
export { BatchPolishButton } from "./BatchPolishButton";
export { BatchPolishProgress } from "./BatchPolishProgress";
export { DetectionResultDisplay, PolishResultDisplay } from "./BatchPolishResult";
export { useBatchPolish } from "./hooks/useBatchPolish";
export type { BatchPolishPhase } from "./hooks/useBatchPolish";
