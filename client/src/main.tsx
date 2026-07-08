import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "highlight.js/styles/github.css";
import DesktopBootstrapBoundary from "./components/layout/DesktopBootstrapBoundary";
import ServerStartupGate from "./components/layout/ServerStartupGate";
import { APP_RUNTIME } from "./lib/constants";
import AppRouter from "./router";
import { Toaster } from "./components/ui/toast";
import { setupGlobalErrorHandlers } from "./lib/logger";
import "./index.css";

// 初始化全局错误捕获
setupGlobalErrorHandlers();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30_000,
      gcTime: 60_000,
    },
  },
});

const AppRouterProvider = APP_RUNTIME === "desktop" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouterProvider>
        <DesktopBootstrapBoundary>
          <ServerStartupGate>
            <AppRouter />
          </ServerStartupGate>
        </DesktopBootstrapBoundary>
        <Toaster />
      </AppRouterProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
