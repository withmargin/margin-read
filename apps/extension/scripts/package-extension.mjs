import { appendFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
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

const name = await resolveManifestMessage(manifest.name, join(dist, "_locales"), manifest.default_locale);
assert(name.startsWith("Margin Read"), "dist manifest name must start with Margin Read.");
const description = await resolveManifestMessage(manifest.description, join(dist, "_locales"), manifest.default_locale);
assert(description.includes("Privacy-first"), "dist manifest description must include Privacy-first.");

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

const packageInfo = await stat(outputPath);
const sizeKiB = packageInfo.size / 1024;
console.log(`Package size: ${formatBytes(packageInfo.size)} (${sizeKiB.toFixed(1)} KiB)`);

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## Extension Package",
      "",
      `- File: \`${relative(repoRoot, outputPath)}\``,
      `- Size: ${formatBytes(packageInfo.size)} (${sizeKiB.toFixed(1)} KiB)`,
      `- Version: \`${version}\``,
      ""
    ].join("\n")
  );
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

// Resolves a manifest field that may be a __MSG_key__ placeholder against the default
// locale's _locales messages, so checks read the real localized text.
async function resolveManifestMessage(value, localesDir, defaultLocale) {
  const match = /^__MSG_(.+)__$/.exec(value ?? "");
  if (!match) {
    return value ?? "";
  }
  const messages = JSON.parse(await readFile(join(localesDir, defaultLocale, "messages.json"), "utf8"));
  return messages[match[1]]?.message ?? "";
}

function containsProviderApiKey(content) {
  const googlePrefix = "AI" + "za";
  const anthropicPrefix = "sk-" + "ant-";
  const openAiProjectPrefix = "sk-" + "proj-";
  return content.includes(anthropicPrefix) || content.includes(openAiProjectPrefix) || content.includes(googlePrefix);
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
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
