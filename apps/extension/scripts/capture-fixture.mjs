import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.out) {
  printUsage();
  process.exit(1);
}

const inputPath = path.resolve(args.input);
const outputBasePath = path.resolve(args.out.replace(/\.html$/i, ""));
const htmlOutputPath = `${outputBasePath}.html`;
const expectedOutputPath = `${outputBasePath}.expected.json`;

const sourceHtml = await readFile(inputPath, "utf8");
const fixtureHtml = sanitizeHtml(sourceHtml);
const expectedSkeleton = `${JSON.stringify(
  {
    expectedTexts: [],
    excludedTexts: [],
    blockShape: []
  },
  null,
  2
)}\n`;

await mkdir(path.dirname(htmlOutputPath), { recursive: true });
await writeFile(htmlOutputPath, fixtureHtml);
await writeFile(expectedOutputPath, expectedSkeleton);

console.log(`Captured fixture HTML: ${htmlOutputPath}`);
console.log(`Created expectation skeleton: ${expectedOutputPath}`);
console.log("Review both files before committing. Remove personal data and fill expectedTexts/excludedTexts.");

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--input" || value === "-i") {
      parsed.input = values[index + 1];
      index += 1;
    } else if (value === "--out" || value === "-o") {
      parsed.out = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function printUsage() {
  console.error("Usage: pnpm fixture:capture -- --input page.html --out test/fixtures/extraction/universal/example");
}

function sanitizeHtml(html) {
  return normalizeWhitespace(
    stripVolatileAttributes(
      stripComments(stripUnsafeBlocks(extractBodyContent(html)))
    )
  );
}

function extractBodyContent(html) {
  const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] ?? html;
}

function stripUnsafeBlocks(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function stripVolatileAttributes(html) {
  return html
    .replace(/\s(?:on[a-z]+|nonce|integrity|crossorigin|referrerpolicy|srcset|sizes|style)="[^"]*"/gi, "")
    .replace(/\s(?:on[a-z]+|nonce|integrity|crossorigin|referrerpolicy|srcset|sizes|style)='[^']*'/gi, "")
    .replace(/\s(?:data-reactroot|data-reactid|data-nextjs-router|data-hydration-on-demand)="[^"]*"/gi, "")
    .replace(/\s(href|src)="https?:\/\/([^/"?#]+)([^"?#]*)[^"]*"/gi, (_match, attribute, host, pathname) => {
      const safePath = pathname && pathname !== "/" ? pathname : "";
      return ` ${attribute}="https://${host}${safePath}"`;
    });
}

function normalizeWhitespace(html) {
  return `${html
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()}\n`;
}
