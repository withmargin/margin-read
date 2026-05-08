import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const shared = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  logLevel: "info"
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [join(root, "src/background/serviceWorker.ts")],
    outfile: join(dist, "background.js")
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/content/contentScript.ts")],
    outfile: join(dist, "content.js")
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/popup/popup.ts")],
    outfile: join(dist, "popup.js")
  }),
  build({
    ...shared,
    entryPoints: [join(root, "src/options/options.ts")],
    outfile: join(dist, "options.js")
  })
]);

for (const file of [
  "manifest.json",
  "public/content.css",
  "public/popup.html",
  "public/popup.css",
  "public/options.html",
  "public/options.css"
]) {
  const target = file.startsWith("public/")
    ? join(dist, file.replace("public/", ""))
    : join(dist, file);
  await cp(join(root, file), target);
}

const manifestPath = join(dist, "manifest.json");
const manifest = await readFile(manifestPath, "utf8");
await writeFile(manifestPath, manifest.replaceAll("public/", ""));
