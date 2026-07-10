import type { CharacterExitStatus } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";

const EXIT_STATUS_CONFIG: Record<
  CharacterExitStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  active: { label: "活跃", variant: "default", className: "bg-green-600 text-white hover:bg-green-700" },
  exited: { label: "已退场", variant: "secondary", className: "bg-gray-400 text-white hover:bg-gray-500" },
  dead: { label: "已死亡", variant: "destructive" },
  frozen: { label: "已冻结", variant: "outline", className: "border-blue-400 text-blue-600" },
};

interface CharacterExitBadgeProps {
  status?: CharacterExitStatus | null;
}

export function CharacterExitBadge({ status }: CharacterExitBadgeProps) {
  const effectiveStatus: CharacterExitStatus = status ?? "active";
  const config = EXIT_STATUS_CONFIG[effectiveStatus];

  if (effectiveStatus === "active") {
    return null;
  }

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
