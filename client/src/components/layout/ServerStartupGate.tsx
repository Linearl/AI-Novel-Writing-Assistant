import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { APP_RUNTIME } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

interface ServerStartupGateProps {
  children: ReactNode;
}

type StartupStatus = "checking" | "ready" | "waiting";

const STARTUP_CHECK_INTERVAL_MS = 1000;
const STARTUP_WAIT_THRESHOLD_MS = 1200;
// 额外等待时间，确保后台服务完全初始化
const POST_HEALTH_READY_DELAY_MS = 1500;

function shouldUseStartupGate(): boolean {
  return import.meta.env.DEV && APP_RUNTIME !== "desktop";
}

async function checkServerReady(signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

function ServerStartupScreen(props: {
  status: StartupStatus;
  onRetry: () => void;
}) {
  const { status, onRetry } = props;
  const waiting = status === "waiting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted/40">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">正在连接本地创作服务</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          页面已准备好，系统会在服务可用后自动进入工作台。
        </p>
        {waiting ? (
          <div className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-2 size-4" aria-hidden="true" />
              重新检查
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ServerStartupGate({ children }: ServerStartupGateProps) {
  const enabled = useMemo(() => shouldUseStartupGate(), []);
  const [status, setStatus] = useState<StartupStatus>(enabled ? "checking" : "ready");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled || status === "ready") {
      return;
    }

    logger.info("ServerStartupGate: Starting health check", { enabled, status });

    const abortController = new AbortController();
    let waitingTimeoutId: number | undefined;
    let readyDelayTimeoutId: number | undefined;
    let intervalId: number | undefined;
    let probeCount = 0;

    // 超时后显示等待界面
    waitingTimeoutId = window.setTimeout(() => {
      logger.warn("ServerStartupGate: Health check timeout, showing waiting screen");
      setStatus((current) => (current === "ready" ? current : "waiting"));
    }, STARTUP_WAIT_THRESHOLD_MS);

    async function probe() {
      probeCount++;
      const ready = await checkServerReady(abortController.signal);
      if (abortController.signal.aborted) {
        return;
      }
      if (ready) {
        logger.info(`ServerStartupGate: Health check passed (attempt ${probeCount}), waiting for backend services`);
        // 停止轮询
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
        // 清除等待超时
        if (waitingTimeoutId !== undefined) {
          window.clearTimeout(waitingTimeoutId);
          waitingTimeoutId = undefined;
        }
        // Health 接口就绪后，额外等待一段时间让后台服务完成初始化
        readyDelayTimeoutId = window.setTimeout(() => {
          if (!abortController.signal.aborted) {
            logger.info("ServerStartupGate: Ready to render application");
            setStatus("ready");
          }
        }, POST_HEALTH_READY_DELAY_MS);
      }
    }

    void probe();
    intervalId = window.setInterval(() => {
      void probe();
    }, STARTUP_CHECK_INTERVAL_MS);

    return () => {
      abortController.abort();
      if (waitingTimeoutId !== undefined) {
        window.clearTimeout(waitingTimeoutId);
      }
      if (readyDelayTimeoutId !== undefined) {
        window.clearTimeout(readyDelayTimeoutId);
      }
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, retryToken, status]);

  if (status === "ready") {
    return <>{children}</>;
  }

  return (
    <ServerStartupScreen
      status={status}
      onRetry={() => {
        logger.info("ServerStartupGate: Manual retry triggered");
        setStatus("checking");
        setRetryToken((current) => current + 1);
      }}
    />
  );
}
