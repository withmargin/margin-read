import { readFileSync } from "node:fs";
import { crx, type ManifestV3Export } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";

// The manifest references source entry points (TS/HTML); CRXJS rewrites them to the
// built assets. The version is injected here so package.json stays the single source of
// truth — the on-disk manifest.json never pins a version.
const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8")) as Record<
  string,
  unknown
>;
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

export default defineConfig({
  plugins: [crx({ manifest: { ...manifest, version } as ManifestV3Export })],
  build: {
    // Release packages must not ship source maps (enforced by the readiness checks).
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: true
  },
  // A fixed port keeps the content-script HMR socket stable across dev restarts.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 }
  }
});
