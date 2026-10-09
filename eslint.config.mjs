import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Two Next.js apps, both reading the shared core.
  { settings: { next: { rootDir: ["times-tables/", "git-commands/"] } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Each app's build output:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
