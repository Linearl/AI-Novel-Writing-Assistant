import { defineConfig } from "prisma/config";
import { resolveDatabaseRuntimeConfig } from "./src/config/database";
import { readFileSync } from "fs";
import { resolve } from "path";

// Prisma CLI 在加载 .env 之前求值 prisma.config.ts，需要手动加载
try {
  const envContent = readFileSync(resolve(__dirname, ".env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // .env 文件不存在时静默忽略
}

const runtimeConfig = resolveDatabaseRuntimeConfig();

export default defineConfig({
  schema: runtimeConfig.prismaSchemaPath,
  migrations: {
    path: runtimeConfig.prismaMigrationsPath,
    seed: "ts-node-dev --transpile-only src/db/seed.ts",
  },
  datasource: {
    url: runtimeConfig.url,
  },
});
