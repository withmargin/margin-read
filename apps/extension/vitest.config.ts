import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/shared/**/*.ts",
        "src/background/**/*.ts",
        "src/content/blockCandidates.ts",
        "src/content/extraction/**/*.ts",
        "src/content/siteAdapters/**/*.ts",
        "src/content/translationQueue.ts",
        "src/content/displayStyle.ts",
        "src/content/floatingButton.ts",
        "src/content/readingVisibility.ts",
        "src/content/textBlocks.ts",
        "src/content/translationRenderer.ts"
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/shared/types.ts",
        "src/shared/migrations/versions/current.ts",
        "src/background/providers/types.ts",
        "src/content/siteAdapters/types.ts"
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95
      }
    }
  }
});
