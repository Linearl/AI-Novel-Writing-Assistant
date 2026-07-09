import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  resolve: (value: boolean) => void;
};

const DEFAULT_STATE: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "确认",
  variant: "default",
  resolve: () => {},
};

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
};

/**
 * 用法：
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm();
 * const confirmed = await confirm("确认删除？", { title: "删除确认" });
 * if (!confirmed) return;
 * ```
 * 在 JSX 中渲染 `<ConfirmDialog />`。
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);

  const confirm = useCallback(
    (message: string, options?: ConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title: options?.title ?? "操作确认",
          message,
          confirmLabel: options?.confirmLabel ?? "确认",
          variant: options?.variant ?? "default",
          resolve,
        });
      });
    },
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && state.open) {
        state.resolve(false);
        setState(DEFAULT_STATE);
      }
    },
    [state],
  );

  const handleConfirm = useCallback(() => {
    state.resolve(true);
    setState(DEFAULT_STATE);
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve(false);
    setState(DEFAULT_STATE);
  }, [state]);

  const ConfirmDialog = useCallback(() => (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line pt-2 text-sm text-foreground">
            {state.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            variant={state.variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {state.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ), [state, handleOpenChange, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
