import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, "../..");
const artifactsDir = join(repoRoot, "artifacts");
const failures = [];
const warnings = [];

const rootPackagePath = join(repoRoot, "package.json");
const extensionPackagePath = join(root, "package.json");
const sourceManifestPath = join(root, "manifest.json");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const defaultsPath = join(root, "src/shared/defaults.ts");

const rootPackage = await readJson(rootPackagePath);
const extensionPackage = await readJson(extensionPackagePath);
const sourceManifest = await readJson(sourceManifestPath);
const version = sourceManifest.version;
const artifactPath = join(artifactsDir, `margin-read-v${version}.zip`);

checkVersionConsistency();
await checkChangelog();
await checkPrivacyDefaults();
checkSourceManifest(sourceManifest, "source manifest");
await checkArtifact();

if (failures.length > 0) {
  console.error("Release readiness checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (warnings.length > 0) {
    console.error("");
    console.error("Warnings:");
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log(`Release readiness checks passed for v${version}.`);
if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function checkVersionConsistency() {
  assert(isSemver(version), `manifest version must be a semver version. Got ${version}.`);
  assert(rootPackage.version === version, `root package version must match manifest version ${version}.`);
  assert(extensionPackage.version === version, `extension package version must match manifest version ${version}.`);

  const refName = process.env.GITHUB_REF_NAME;
  if (refName?.startsWith("v")) {
    assert(refName === `v${version}`, `release tag ${refName} must match manifest version v${version}.`);
  }
}

async function checkChangelog() {
  const changelog = await readFile(changelogPath, "utf8");
  assert(changelog.includes(`## [${version}]`), `CHANGELOG.md must contain a section for ${version}.`);
  assert(
    /\n## \[Unreleased\]\n/.test(changelog),
    "CHANGELOG.md must keep an [Unreleased] section."
  );
}

async function checkPrivacyDefaults() {
  const defaults = await readFile(defaultsPath, "utf8");
  assert(
    /cacheMode:\s*"session"/.test(defaults),
    "DEFAULT_SETTINGS.cacheMode must remain session for the privacy-first release default."
  );
}

function checkSourceManifest(manifest, label) {
  assert(manifest.manifest_version === 3, `${label} must use Manifest V3.`);
  assert(manifest.name === "Margin Read", `${label} name must be Margin Read.`);
  assert(
    manifest.description === rootPackage.description &&
      manifest.description === extensionPackage.description,
    `${label} description must match package descriptions.`
  );
  assert(!manifest.content_security_policy, `${label} must not define a custom content_security_policy.`);
  assert(!jsonContainsRemoteCodeReference(manifest), `${label} must not reference remote scripts or styles.`);
  assert(!usesDangerousPermission(manifest), `${label} must not request high-risk permissions.`);
  assert(hasExpectedPermissions(manifest), `${label} permissions changed; update release readiness allowlist deliberately.`);
  assert(
    manifest.background?.type === "module",
    `${label} background service worker must be an ES module.`
  );
}

async function checkArtifact() {
  if (!(await exists(artifactPath))) {
    fail(
      `release artifact ${relative(repoRoot, artifactPath)} is missing. ` +
        "Run `pnpm package:extension` before `pnpm check:release-readiness`."
    );
    return;
  }

  const artifact = await stat(artifactPath);
  assert(artifact.size > 0, `${relative(repoRoot, artifactPath)} must not be empty.`);
  assert(artifact.size < 10 * 1024 * 1024, `${relative(repoRoot, artifactPath)} should stay under 10 MiB.`);

  const entries = listZipEntries(artifactPath);
  if (entries.length === 0) {
    fail(`${relative(repoRoot, artifactPath)} did not list any zip entries.`);
    return;
  }

  const entrySet = new Set(entries.map(normalizeZipEntry));
  const zipManifest = readZipJson(artifactPath, "manifest.json");
  if (!zipManifest) {
    fail("release artifact must include manifest.json at the zip root.");
    return;
  }

  assert(
    JSON.stringify(zipManifest) === JSON.stringify(sourceManifest),
    "artifact manifest.json must match apps/extension/manifest.json."
  );
  checkSourceManifest(zipManifest, "artifact manifest");
  checkRequiredManifestFiles(zipManifest, entrySet);
  checkZipContents(entries);
  checkZipTextContents(entries);
}

function checkRequiredManifestFiles(manifest, entrySet) {
  const required = new Set();

  for (const iconPath of Object.values(manifest.icons ?? {})) {
    required.add(iconPath);
  }
  for (const iconPath of Object.values(manifest.action?.default_icon ?? {})) {
    required.add(iconPath);
  }
  if (manifest.action?.default_popup) {
    required.add(manifest.action.default_popup);
  }
  if (manifest.options_page) {
    required.add(manifest.options_page);
  }
  if (manifest.background?.service_worker) {
    required.add(manifest.background.service_worker);
  }
  for (const script of manifest.content_scripts ?? []) {
    for (const js of script.js ?? []) {
      required.add(js);
    }
    for (const css of script.css ?? []) {
      required.add(css);
    }
  }

  for (const file of required) {
    assert(entrySet.has(file), `release artifact must include ${file}.`);
  }
}

function checkZipContents(entries) {
  for (const rawEntry of entries) {
    const entry = normalizeZipEntry(rawEntry);
    assert(entry === rawEntry, `zip entry ${rawEntry} must use normalized relative paths.`);
    assert(!entry.startsWith("/"), `zip entry ${entry} must not be absolute.`);
    assert(!entry.includes("../"), `zip entry ${entry} must not contain parent-directory traversal.`);
    assert(!entry.startsWith("node_modules/"), `zip entry ${entry} must not include dependencies.`);
    assert(!entry.startsWith("src/"), `zip entry ${entry} must not include source files.`);
    assert(!entry.startsWith("test/") && !entry.startsWith("tests/"), `zip entry ${entry} must not include tests.`);
    assert(!entry.includes("__fixtures__/"), `zip entry ${entry} must not include test fixtures.`);
    assert(!entry.startsWith(".github/"), `zip entry ${entry} must not include GitHub workflow files.`);
    assert(!entry.startsWith("docs/"), `zip entry ${entry} must not include repository docs.`);
    assert(!entry.startsWith("artifacts/"), `zip entry ${entry} must not include nested artifacts.`);
    assert(!entry.endsWith(".map"), `zip entry ${entry} must not include source maps.`);
    assert(!/\.(?:ts|tsx)$/.test(entry), `zip entry ${entry} must not include TypeScript source.`);
    assert(!/(^|\/)\.env(?:\.|$)/.test(entry), `zip entry ${entry} must not include environment files.`);
    assert(!/(^|\/)\.DS_Store$/.test(entry), `zip entry ${entry} must not include macOS metadata.`);
    assert(!/(^|\/)package-lock\.json$/.test(entry), `zip entry ${entry} must not include lockfiles.`);
    assert(!/(^|\/)pnpm-lock\.yaml$/.test(entry), `zip entry ${entry} must not include lockfiles.`);
  }
}

function checkZipTextContents(entries) {
  for (const entry of entries.map(normalizeZipEntry)) {
    if (!/\.(?:js|json|html|css)$/.test(entry)) {
      continue;
    }

    const content = readZipText(artifactPath, entry);
    assert(!containsProviderApiKey(content), `${entry} appears to contain a provider API key.`);
    if (entry !== "manifest.json") {
      assert(!/<script[^>]+src=["']https?:\/\//i.test(content), `${entry} must not load remote scripts.`);
    }
  }
}

function listZipEntries(path) {
  const result = spawnSync("unzip", ["-Z1", path], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(result.stderr || result.stdout || `Failed to inspect ${relative(repoRoot, path)}.`);
    return [];
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function readZipJson(path, entry) {
  const content = readZipText(path, entry);
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${entry} in release artifact is not valid JSON: ${error.message}`);
    return null;
  }
}

function readZipText(path, entry) {
  const result = spawnSync("unzip", ["-p", path, entry], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) {
    fail(result.stderr || result.stdout || `Failed to read ${entry} from ${relative(repoRoot, path)}.`);
    return "";
  }
  return result.stdout;
}

function normalizeZipEntry(entry) {
  return entry.replaceAll("\\", "/").replace(/^\.\//, "");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function fail(message) {
  failures.push(message);
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}

function hasExpectedPermissions(value) {
  const permissions = [...(value.permissions ?? [])].sort();
  const hostPermissions = [...(value.host_permissions ?? [])].sort();
  return JSON.stringify(permissions) === JSON.stringify(["activeTab", "storage"]) &&
    JSON.stringify(hostPermissions) === JSON.stringify(["<all_urls>"]);
}

function usesDangerousPermission(value) {
  const permissions = new Set([...(value.permissions ?? []), ...(value.optional_permissions ?? [])]);
  const dangerous = ["tabs", "cookies", "webRequest", "webRequestBlocking", "management", "scripting", "debugger"];
  return dangerous.some((permission) => permissions.has(permission));
}

function jsonContainsRemoteCodeReference(value) {
  const json = JSON.stringify(value);
  return /https?:\/\/.+\.(?:js|mjs|css)(?:["?#]|$)/i.test(json);
}

function containsProviderApiKey(content) {
  const googlePrefix = "AI" + "za";
  const anthropicPrefix = "sk-" + "ant-";
  const openAiProjectPrefix = "sk-" + "proj-";
  return content.includes(anthropicPrefix) || content.includes(openAiProjectPrefix) || content.includes(googlePrefix);
}
