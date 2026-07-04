import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { exportOutlineTxt, importOutlineTxt } from "@/api/novel/txtIo";
import PaceCurveChart from "./PaceCurveChart";
import PayoffLedgerPanel from "./payoff/PayoffLedgerPanel";
import StructuredOutlineWorkspace from "./StructuredOutlineWorkspace";
import TxtIoToolbar from "./TxtIoToolbar";
import type { StructuredTabViewProps } from "./NovelEditView.types";

export default function StructuredOutlineTab(props: StructuredTabViewProps) {
  const [paceExpanded, setPaceExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">大纲导入 / 导出</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            将大纲导出为 TXT 文件，或从 TXT 文件导入大纲。
          </div>
        </div>
        <TxtIoToolbar
          assetLabel="大纲"
          onExport={() => exportOutlineTxt(props.novelId, props.novelTitle ?? "未命名小说")}
          onImport={(content, mode) => importOutlineTxt(props.novelId, content, mode as "overwrite" | "append")}
        />
      </div>

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

      <PayoffLedgerPanel novelId={props.novelId} />
    </div>
  );
}
