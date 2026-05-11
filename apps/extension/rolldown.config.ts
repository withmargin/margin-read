import { defineConfig } from "rolldown";

const entries = {
  background: "src/background/serviceWorker.ts",
  content: "src/content/contentScript.ts",
  popup: "src/popup/popup.ts",
  options: "src/options/options.ts"
};

export default defineConfig(
  Object.entries(entries).map(([name, input]) => ({
    input,
    output: {
      file: `dist/${name}.js`,
      format: "esm" as const,
      sourcemap: true
    }
  }))
);
