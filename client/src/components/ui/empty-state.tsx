import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "plain" | "dashed";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

function EmptyState({
  variant = "plain",
  title,
  description,
  action,
  icon,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground",
        variant === "dashed" && "rounded-lg border border-dashed p-6",
        className,
      )}
      {...props}
    >
      {icon && <div className="mb-2">{icon}</div>}
      {title && <div className="font-medium text-foreground">{title}</div>}
      {description && <div className="mt-1 text-xs">{description}</div>}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

EmptyState.displayName = "EmptyState";

export { EmptyState, type EmptyStateProps, type EmptyStateVariant };
