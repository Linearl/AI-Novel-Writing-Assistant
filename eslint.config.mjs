import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/desktop/build/**",
      "**/release/**",
      "**/temp/**",
      "**/worktree/**",
      "**/server/tmp/**",
      "**/server/storage/**",
      "**/server/scripts/**",
      "**/server/src/prisma/dev.db*",
      "**/*.test.*",
      "**/tests/**",
    ],
  },
  // 基础 TypeScript 推荐规则
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-multiple-empty-lines": "off",
      "no-trailing-spaces": "off",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // 模块边界规则（仅 server 端）
  {
    files: ["server/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@prisma/client"],
              message:
                "请通过项目统一的 db/prisma 导出导入 PrismaClient",
            },
            {
              group: ["**/services/novel/director/**"],
              message:
                "请引用 orchestration/pipeline/，不要直接导入 director 内部",
            },
          ],
        },
      ],
    },
  },
  // 循环依赖检测
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { import: importPlugin },
    rules: {
      "import/no-cycle": ["warn", { maxDepth: 10, ignoreExternal: true }],
      "import/no-self-import": "error",
    },
  },
);
