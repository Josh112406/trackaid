import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const nextConfigs = [...nextVitals, ...nextTypescript].map((config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([name, setting]) => [
      name,
      // eslint-plugin-react 7 uses an API removed by ESLint 10. Keep the
      // compatible Next, hooks, accessibility, and TypeScript checks active.
      name.startsWith("react/") ? "off" : setting,
    ]),
  ),
}));

export default defineConfig([
  ...nextConfigs,
  globalIgnores([".next/**", "coverage/**", "work/**", "outputs/**"]),
]);
