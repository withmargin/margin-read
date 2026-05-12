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
        "src/content/translationQueue.ts",
        "src/content/displayStyle.ts",
        "src/content/textBlocks.ts",
        "src/content/youtubeCaptionTracks.ts",
        "src/content/youtubeControls.ts"
      ],
      exclude: ["src/**/*.test.ts", "src/shared/types.ts", "src/background/providers/types.ts"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95
      }
    }
  }
});
