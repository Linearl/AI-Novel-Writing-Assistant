import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingVariant = "spinner" | "text";

interface LoadingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LoadingVariant;
  text?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
} as const;

function LoadingIndicator({
  variant = "text",
  text = "加载中...",
  size = "md",
  className,
  ...props
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      {variant === "spinner" && (
        <Loader2 className={cn("animate-spin", sizeStyles[size], text && "mr-2")} />
      )}
      {text}
    </div>
  );
}

LoadingIndicator.displayName = "LoadingIndicator";

export { LoadingIndicator, type LoadingIndicatorProps, type LoadingVariant };
