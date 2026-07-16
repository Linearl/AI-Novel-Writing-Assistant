import type { AutoDirectorCreateStepDef, AutoDirectorCreateStepKey } from "../useAutoDirectorCreateController";

interface DirectorCreateStepBarProps {
  steps: AutoDirectorCreateStepDef[];
  activeStep: AutoDirectorCreateStepKey;
  completedSteps: Set<AutoDirectorCreateStepKey>;
  onStepClick: (step: AutoDirectorCreateStepKey) => void;
  hidden?: boolean;
}

export default function DirectorCreateStepBar({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
  hidden = false,
}: DirectorCreateStepBarProps) {
  if (hidden || steps.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(step.key);
        const isActive = step.key === activeStep;
        const isClickable = isCompleted || isActive;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {index > 0 ? (
              <div className="mx-1 h-px w-4 bg-border" />
            ) : null}
            <button
              type="button"
              disabled={!isClickable}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                    ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                    : "cursor-default text-muted-foreground opacity-50"
              }`}
              onClick={() => isClickable && onStepClick(step.key)}
              title={isCompleted ? `${step.label}（已完成）` : isActive ? `${step.label}（当前）` : step.label}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                isActive ? "bg-primary-foreground text-primary" : "bg-border text-muted-foreground"
              }`}>
                {step.order + 1}
              </span>
              <span>{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
