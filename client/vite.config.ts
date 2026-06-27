import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

interface DesktopPackageJson {
  version?: unknown;
}

function clearStaleOptimizeCache(rootDir: string): void {
  const cacheDir = path.resolve(rootDir, "node_modules/.vite");
  const depsDir = path.join(cacheDir, "deps");
  const metadataPath = path.join(depsDir, "_metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return;
  }

  try {
    const rawMetadata = fs.readFileSync(metadataPath, "utf8");
    const metadata = JSON.parse(rawMetadata) as {
      optimized?: Record<string, { src?: string }>;
    };
    const hasMissingSource = Object.values(metadata.optimized ?? {}).some((entry) => {
      if (!entry?.src) {
        return false;
      }
      const resolvedSource = path.resolve(depsDir, entry.src);
      return !fs.existsSync(resolvedSource);
    });
    if (!hasMissingSource) {
      return;
    }
  } catch {
    // Broken metadata should be treated the same as stale metadata.
  }

  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.info("[vite] Cleared stale optimize cache because cached dependency sources no longer exist.");
}

function resolveDevProxyTarget(): string {
  const configuredHost = process.env.HOST?.trim();

  // 优先从环境变量读取，否则从 server/.env 文件读取 PORT。
  // server 通过 dotenv 加载 server/.env，但 Vite 进程不会自动加载它，
  // 导致 process.env.PORT 未定义时回退到 3000，而 server 实际监听 3100。
  let port = Number(process.env.PORT);
  if (!Number.isFinite(port) || port <= 0) {
    try {
      const serverEnvPath = path.resolve(__dirname, "../server/.env");
      const serverEnvContent = fs.readFileSync(serverEnvPath, "utf8");
      const portMatch = serverEnvContent.match(/^PORT\s*=\s*(\d+)/m);
      if (portMatch) {
        port = Number(portMatch[1]);
      }
    } catch {
      // server/.env 不存在或不可读，使用默认值
    }
  }
  if (!Number.isFinite(port) || port <= 0) {
    port = 3000;
  }

  const targetHost = configuredHost && !["0.0.0.0", "::"].includes(configuredHost)
    ? configuredHost
    : "127.0.0.1";
  return `http://${targetHost}:${port}`;
}

function resolveDesktopAppVersion(): string {
  const desktopPackagePath = path.resolve(__dirname, "../desktop/package.json");
  const packageJson = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8")) as DesktopPackageJson;
  const version = typeof packageJson.version === "string" ? packageJson.version.trim() : "";
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`desktop/package.json version must be stable semver like 0.3.19, got ${version || "(empty)"}.`);
  }
  return version;
}

clearStaleOptimizeCache(__dirname);

const isDesktopRelativeBaseBuild = process.env.AI_NOVEL_CLIENT_BASE === "relative";
const appVersion = resolveDesktopAppVersion();

export default defineConfig({
  base: isDesktopRelativeBaseBuild ? "./" : "/",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@ai-novel/shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("@assistant-ui") || id.includes("@langchain/langgraph-sdk")) {
            return "assistant-ui";
          }
          if (id.includes("platejs") || id.includes("@platejs")) {
            return "plate-editor";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: resolveDevProxyTarget(),
        changeOrigin: true,
      },
    },
  },
});
