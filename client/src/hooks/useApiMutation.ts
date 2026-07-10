import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";

/**
 * 通用 API mutation hook，封装 useMutation + toast + invalidateQueries 模式。
 *
 * - `successMessage` / `errorMessage` 均为可选：不传则不弹 toast。
 * - `errorMessage` 不传时默认弹 "操作失败"。
 * - `onSuccess` / `onError` 在 toast 之后执行。
 */
export interface UseApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueries?: string[][];
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "操作失败";
}

export function useApiMutation<TData = unknown, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
): UseMutationResult<TData, unknown, TVariables> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data, variables) => {
      // invalidate
      if (options.invalidateQueries) {
        for (const key of options.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      // toast
      if (options.successMessage) {
        const msg =
          typeof options.successMessage === "function"
            ? options.successMessage(data)
            : options.successMessage;
        toast.success(msg);
      }
      // callback
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      if (options.errorMessage) {
        const msg =
          typeof options.errorMessage === "function"
            ? options.errorMessage(error)
            : options.errorMessage;
        toast.error(msg);
      } else {
        toast.error(extractErrorMessage(error));
      }
      options.onError?.(error, variables);
    },
  });
}
