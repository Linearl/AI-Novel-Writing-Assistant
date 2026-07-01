import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import PaceCurveChart from "./PaceCurveChart";
import StructuredOutlineWorkspace from "./StructuredOutlineWorkspace";
import type { StructuredTabViewProps } from "./NovelEditView.types";

export default function StructuredOutlineTab(props: StructuredTabViewProps) {
  const [paceExpanded, setPaceExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <StructuredOutlineWorkspace {...props} />

      <div className="rounded-lg border">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setPaceExpanded((prev) => !prev)}
        >
          {paceExpanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
          全书节奏曲线
        </button>
        {paceExpanded && (
          <div className="px-4 pb-4">
            <PaceCurveChart novelId={props.novelId} />
          </div>
        )}
      </div>
    </div>
  );
}
