import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const failures = [];

const BUNDLE_SIZE_BUDGETS = {
  "background.js": 20 * 1024,
  "popup.js": 10 * 1024,
  "content.js": 100 * 1024,
  "options.js": 80 * 1024
};

assert(manifest.manifest_version === 3, "manifest_version must be 3.");
assert(!manifest.background || manifest.background.type === "module", "background service worker must be an ES module.");
assert(!manifest.content_security_policy, "custom content_security_policy is not allowed without security review.");
assert(!hasRemoteScript(manifest), "manifest must not reference remote scripts.");
assert(!usesDangerousPermission(manifest), "manifest uses a high-risk permission.");
assert(hasMinimalKnownPermissions(manifest), "manifest permissions changed; update the allowlist in check-extension.mjs.");

const files = await listProjectFiles(root);
for (const file of files) {
  if (file.endsWith("scripts/check-extension.mjs")) {
    continue;
  }

  const content = await readFile(file, "utf8");
  assert(!/\beval\s*\(/.test(content), `${file} must not use dynamic code evaluation.`);
  assert(!/\bnew\s+Function\s*\(/.test(content), `${file} must not construct executable strings.`);
  assert(!/<script[^>]+src=["']https?:\/\//i.test(content), `${file} must not load remote scripts.`);
  assert(!containsProviderApiKey(content), `${file} appears to contain a provider API key.`);
}

function containsProviderApiKey(content) {
  const googlePrefix = "AI" + "za";
  return content.includes("sk-ant-") || content.includes("sk-proj-") || content.includes(googlePrefix);
}

await checkBundleSizes();

async function checkBundleSizes() {
  const distDir = join(root, "dist");
  if (!(await exists(distDir))) {
    return;
  }

  for (const [name, limit] of Object.entries(BUNDLE_SIZE_BUDGETS)) {
    const path = join(distDir, name);
    if (!(await exists(path))) {
      continue;
    }
    const info = await stat(path);
    assert(
      info.size <= limit,
      `${name} (${info.size} bytes) exceeds bundle budget of ${limit} bytes. ` +
        `A regression here usually means an SDK or large dependency was imported as runtime instead of type-only.`
    );
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (failures.length > 0) {
  console.error("Extension checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Extension checks passed.");

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function hasRemoteScript(value) {
  return JSON.stringify(value).includes("http://") || JSON.stringify(value).includes("https://");
}

function usesDangerousPermission(value) {
  const permissions = new Set([...(value.permissions ?? []), ...(value.optional_permissions ?? [])]);
  const dangerous = ["tabs", "cookies", "webRequest", "webRequestBlocking", "management", "scripting", "debugger"];
  return dangerous.some((permission) => permissions.has(permission));
}

function hasMinimalKnownPermissions(value) {
  const permissions = [...(value.permissions ?? [])].sort();
  const hostPermissions = [...(value.host_permissions ?? [])].sort();
  return JSON.stringify(permissions) === JSON.stringify(["activeTab", "storage"]) &&
    JSON.stringify(hostPermissions) === JSON.stringify(["<all_urls>"]);
}

async function listProjectFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    if ([".git", "coverage", "dist", "node_modules"].includes(entry)) {
      continue;
    }

    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...await listProjectFiles(path));
      continue;
    }

    if (/\.(?:html|js|mjs|json|ts|css|md)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}
