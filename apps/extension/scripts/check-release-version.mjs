import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, "../..");
const expectedVersion = getExpectedVersion();
const rootPackage = await readJson(join(repoRoot, "package.json"));
const extensionPackage = await readJson(join(root, "package.json"));
const failures = [];

// The manifest version is injected at build from package.json, so only the
// package.json files are checked against the release tag here.
assert(rootPackage.version === expectedVersion, `root package version must be ${expectedVersion}.`);
assert(extensionPackage.version === expectedVersion, `extension package version must be ${expectedVersion}.`);

if (failures.length > 0) {
  console.error("Release version check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release version check passed for v${expectedVersion}.`);

function getExpectedVersion() {
  const refName = process.env.GITHUB_REF_NAME;
  if (refName) {
    if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(refName)) {
      console.error(`Release tag must use vMAJOR.MINOR.PATCH format. Got ${refName}.`);
      process.exit(1);
    }
    return refName.slice(1);
  }

  const fallback = process.argv[2];
  if (fallback) {
    return fallback.replace(/^v/, "");
  }

  console.error("Missing release tag. Set GITHUB_REF_NAME or pass a version argument.");
  process.exit(1);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
