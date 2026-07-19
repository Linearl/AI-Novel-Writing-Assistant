import { Input } from "@/components/ui/input";

interface ProviderRequestLimitFieldsProps {
  concurrencyLimit: string;
  requestIntervalMs: string;
  rpm: string;
  tpm: string;
  onChange: (value: {
    concurrencyLimit?: string;
    requestIntervalMs?: string;
    rpm?: string;
    tpm?: string;
  }) => void;
}

export default function ProviderRequestLimitFields({
  concurrencyLimit,
  requestIntervalMs,
  rpm,
  tpm,
  onChange,
}: ProviderRequestLimitFieldsProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">同模型并发上限</div>
        <Input
          type="number"
          min={0}
          step={1}
          value={concurrencyLimit}
          placeholder="0"
          onChange={(event) => onChange({ concurrencyLimit: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          0 表示不限制。同一供应商和模型的请求超过上限时会排队执行。
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">同模型请求间隔（毫秒）</div>
        <Input
          type="number"
          min={0}
          step={100}
          value={requestIntervalMs}
          placeholder="0"
          onChange={(event) => onChange({ requestIntervalMs: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          0 表示不限制。用于控制同一供应商和模型的连续发起速度。
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">每分钟请求数上限（RPM）</div>
        <Input
          type="number"
          min={0}
          step={1}
          value={rpm}
          placeholder="60"
          onChange={(event) => onChange({ rpm: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          60 秒滑动窗口内的最大请求数。0 表示不限制。超过时排队等待窗口滑动。
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">每分钟 Token 数上限（TPM）</div>
        <Input
          type="number"
          min={0}
          step={1000}
          value={tpm}
          placeholder="120000"
          onChange={(event) => onChange({ tpm: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          连续令牌桶限速。令牌按分钟配额匀速补充；0 表示不限制。
        </div>
      </div>
    </div>
  );
}

export function ProviderRequestLimitSummary({
  concurrencyLimit,
  requestIntervalMs,
  rpm,
  tpm,
}: {
  concurrencyLimit: number;
  requestIntervalMs: number;
  rpm: number;
  tpm: number;
}) {
  return (
    <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
      请求限制：并发 {concurrencyLimit || "不限制"} · 间隔 {requestIntervalMs ? `${requestIntervalMs}ms` : "不限制"} · RPM {rpm || "不限制"} · TPM {tpm ? tpm.toLocaleString() : "不限制"}
    </div>
  );
}
