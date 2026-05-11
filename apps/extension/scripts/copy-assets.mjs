import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

await mkdir(dist, { recursive: true });

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
