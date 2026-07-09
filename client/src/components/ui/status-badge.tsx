import * as React from "react";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "success" | "warning" | "error" | "info";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  solid?: boolean;
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

const solidVariantStyles: Record<StatusBadgeVariant, string> = {
  success: "bg-emerald-600 text-white ring-emerald-600",
  warning: "bg-amber-500 text-white ring-amber-500",
  error: "bg-red-600 text-white ring-red-600",
  info: "bg-blue-600 text-white ring-blue-600",
};

function StatusBadge({ variant = "success", solid = false, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        solid ? solidVariantStyles[variant] : variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

StatusBadge.displayName = "StatusBadge";

export { StatusBadge, type StatusBadgeProps, type StatusBadgeVariant };
