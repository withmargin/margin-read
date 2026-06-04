import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, "../..");
const dist = join(root, "dist");

await mkdir(dist, { recursive: true });

for (const file of [
  "manifest.json",
  "public/content.css",
  "public/popup.html",
  "public/popup.css",
  "public/options.html",
  "public/options.css",
  "public/icons"
]) {
  const target = file.startsWith("public/")
    ? join(dist, file.replace("public/", ""))
    : join(dist, file);
  await cp(join(root, file), target, { recursive: true });
}

// The manifest does not store a version on disk; inject it from the root
// package.json so package.json stays the single source of truth.
const { version } = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
const manifestPath = join(dist, "manifest.json");
const manifest = JSON.parse((await readFile(manifestPath, "utf8")).replaceAll("public/", ""));

// Insert version right after description, preserving the source key order.
const versioned = {};
for (const [key, value] of Object.entries(manifest)) {
  versioned[key] = value;
  if (key === "description") versioned.version = version;
}
if (!("version" in versioned)) versioned.version = version;

await writeFile(manifestPath, JSON.stringify(versioned, null, 2) + "\n");
