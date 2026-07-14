import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchPolishButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function BatchPolishButton({ onClick, disabled, loading }: BatchPolishButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      批量润色
    </Button>
  );
}

BatchPolishButton.displayName = "BatchPolishButton";
