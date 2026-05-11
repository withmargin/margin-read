import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, "../..");
const dist = join(root, "dist");
const artifacts = join(repoRoot, "artifacts");
const manifestPath = join(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const version = manifest.version;
const packageName = `margin-read-v${version}.zip`;
const outputPath = join(artifacts, packageName);
const failures = [];

assert(manifest.name === "Margin Read", "dist manifest name must be Margin Read.");
assert(
  manifest.description?.includes("Privacy-first"),
  "dist manifest description must include Privacy-first."
);

const files = await listFiles(dist);
for (const file of files) {
  const name = relative(dist, file);
  assert(!name.startsWith("node_modules/"), `${name} must not include dependencies.`);
  assert(!name.includes(".env"), `${name} must not include environment files.`);
  assert(!/\.(?:ts|tsx|test\.[cm]?js|test\.ts)$/.test(name), `${name} must not include source or tests.`);

  if (/\.(?:js|json|html|css)$/.test(name)) {
    const content = await readFile(file, "utf8");
    assert(!containsProviderApiKey(content), `${name} appears to contain a provider API key.`);
  }
}

if (failures.length > 0) {
  console.error("Extension package checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

await mkdir(artifacts, { recursive: true });
await rm(outputPath, { force: true });

const zip = spawnSync("zip", ["-qr", outputPath, ".", "-x", "*.map"], {
  cwd: dist,
  encoding: "utf8"
});

if (zip.status !== 0) {
  console.error(zip.stderr || zip.stdout || "Failed to create extension package.");
  process.exit(zip.status ?? 1);
}

console.log(`Packaged ${relative(repoRoot, outputPath)}`);

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function containsProviderApiKey(content) {
  const googlePrefix = "AI" + "za";
  const anthropicPrefix = "sk-" + "ant-";
  const openAiProjectPrefix = "sk-" + "proj-";
  return content.includes(anthropicPrefix) || content.includes(openAiProjectPrefix) || content.includes(googlePrefix);
}

async function listFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await listFiles(path));
      continue;
    }
    files.push(path);
  }

  return files;
}
