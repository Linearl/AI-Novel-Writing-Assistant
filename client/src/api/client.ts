import axios, { AxiosError } from "axios";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";

export interface ApiHttpError extends Error {
  status?: number;
  details?: unknown;
}

declare module "axios" {
  interface AxiosRequestConfig {
    silentErrorStatuses?: number[];
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

const AUTO_DISMISS_SERVER_ERROR_TOAST = {
  duration: 4000,
  closeButton: false,
} as const;

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    const backendError = error.response?.data?.error;
    const backendMessage = error.response?.data?.message;
    const backendErrorId = (error.response?.data as Record<string, unknown> | undefined)?.errorId;
    const errorId = typeof backendErrorId === "string" ? backendErrorId : undefined;
    const silentErrorStatuses = error.config?.silentErrorStatuses ?? [];
    let title = backendError ?? error.message ?? "请求失败。";
    let description = backendMessage && backendMessage !== backendError ? backendMessage : undefined;

    if (!status) {
      title = "网络连接失败，请检查网络后重试。";
      description = undefined;
    } else if (status >= 500) {
      title = backendError ?? "服务器错误，请稍后重试。";
      description = backendMessage && backendMessage !== title ? backendMessage : undefined;
    }

    if (!status || !silentErrorStatuses.includes(status)) {
      const isGenericServerErrorToast = title === "服务器错误，请稍后重试。";

      let toastDescription = description;
      if (errorId) {
        const errorIdLine = `Error ID: ${errorId}`;
        toastDescription = toastDescription ? `${toastDescription}\n${errorIdLine}` : errorIdLine;
      }

      if (toastDescription) {
        toast.error(
          title,
          isGenericServerErrorToast
            ? {
                description: toastDescription,
                ...AUTO_DISMISS_SERVER_ERROR_TOAST,
              }
            : { description: toastDescription },
        );
      } else {
        toast.error(title, isGenericServerErrorToast ? AUTO_DISMISS_SERVER_ERROR_TOAST : undefined);
      }
    }

    const message = description ? `${title} ${description}` : title;

    const normalizedError = new Error(
      message,
    ) as ApiHttpError;
    normalizedError.status = status;
    normalizedError.details = error.response?.data;
    return Promise.reject(normalizedError);
  },
);
