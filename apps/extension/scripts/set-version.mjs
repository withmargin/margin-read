import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Single entry point for bumping the release version.
//
//   pnpm version:set 0.3.4 [yyyy-mm-dd]
//
// Writes the version into the root and extension package.json files and cuts a
// CHANGELOG section from the current [Unreleased] notes. The extension manifest
// version is intentionally NOT stored on disk: it is injected at build time from
// the root package.json by scripts/copy-assets.mjs, so there is one source of
// truth and no manifest copy to keep in sync.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, "../..");

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: pnpm version:set <version> [yyyy-mm-dd]");
  process.exit(1);
}

const version = raw.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Version must be semver (MAJOR.MINOR.PATCH). Got ${version}.`);
  process.exit(1);
}

const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);

await bumpPackage(join(repoRoot, "package.json"));
await bumpPackage(join(root, "package.json"));
await stampChangelog(join(repoRoot, "CHANGELOG.md"));

console.log(`Set version ${version}.`);
console.log("Manifest version is injected at build time from package.json.");
console.log("Next: review CHANGELOG, run checks, then tag v" + version + ".");

async function bumpPackage(path) {
  const text = await readFile(path, "utf8");
  const pattern = /("version":\s*)"[^"]*"/;
  if (!pattern.test(text)) {
    console.error(`Could not find a version field to update in ${path}.`);
    process.exit(1);
  }
  await writeFile(path, text.replace(pattern, `$1"${version}"`));
}

async function stampChangelog(path) {
  const text = await readFile(path, "utf8");
  if (text.includes(`## [${version}]`)) {
    console.log(`CHANGELOG.md already has a [${version}] section; leaving it unchanged.`);
    return;
  }

  const marker = "## [Unreleased]\n";
  const idx = text.indexOf(marker);
  if (idx === -1) {
    console.error("CHANGELOG.md is missing an [Unreleased] section to cut from.");
    process.exit(1);
  }

  // Insert the new version header right below [Unreleased]. Existing Unreleased
  // entries fall under the new version, leaving [Unreleased] empty for next time.
  const insertAt = idx + marker.length;
  const section = `\n## [${version}] - ${date}\n`;
  await writeFile(path, text.slice(0, insertAt) + section + text.slice(insertAt));
}
