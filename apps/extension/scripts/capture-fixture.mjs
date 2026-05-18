import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(extensionRoot, "../..");

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

if (!args.out || (!args.input && !args.url) || (args.input && args.url)) {
  printUsage();
  process.exit(1);
}

const outputBasePath = resolveFixtureOutputPath(args.out);
const htmlOutputPath = `${outputBasePath}.html`;
const expectedOutputPath = `${outputBasePath}.expected.json`;

const sourceHtml = await loadSourceHtml(args);
const fixtureHtml = sanitizeHtml(sourceHtml);
const expectedSkeleton = `${JSON.stringify(
  {
    expectedTexts: [],
    excludedTexts: [],
    blockShape: [],
    expectedOccurrences: []
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
    if (value === "--") {
      continue;
    } else if (value === "--help" || value === "-h") {
      parsed.help = true;
    } else if (value === "--input" || value === "-i") {
      parsed.input = values[index + 1];
      index += 1;
    } else if (value === "--url" || value === "-u") {
      parsed.url = values[index + 1];
      index += 1;
    } else if (value === "--out" || value === "-o") {
      parsed.out = values[index + 1];
      index += 1;
    } else if (value === "--cdp") {
      parsed.cdp = values[index + 1];
      index += 1;
    } else if (value === "--wait-ms") {
      parsed.waitMs = values[index + 1];
      index += 1;
    } else if (value === "--wait-selector") {
      parsed.waitSelector = values[index + 1];
      index += 1;
    } else {
      parsed.unknown ??= [];
      parsed.unknown.push(value);
    }
  }
  return parsed;
}

function printUsage() {
  console.error(`Usage:
  pnpm fixture:capture -- --input page.html --out test/fixtures/extraction/universal/example
  pnpm fixture:capture -- --url https://example.com/article --out test/fixtures/extraction/universal/example
  pnpm fixture:capture -- --url https://example.com/app --cdp http://127.0.0.1:9222 --wait-selector main --out test/fixtures/extraction/universal/example

Rendered capture requires Chrome launched with remote debugging, for example:
  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/margin-fixture-chrome
`);
}

async function loadSourceHtml(parsedArgs) {
  if (parsedArgs.unknown?.length) {
    throw new Error(`Unknown arguments: ${parsedArgs.unknown.join(", ")}`);
  }
  if (parsedArgs.input) {
    return readFile(resolveInputPath(parsedArgs.input), "utf8");
  }
  if (parsedArgs.cdp) {
    return captureRenderedHtml(parsedArgs.url, {
      cdpEndpoint: parsedArgs.cdp,
      waitMs: parseWaitMs(parsedArgs.waitMs),
      waitSelector: parsedArgs.waitSelector
    });
  }
  return fetchStaticHtml(parsedArgs.url);
}

function resolveFixtureOutputPath(value) {
  const withoutExtension = value.replace(/\.html$/i, "");
  if (path.isAbsolute(withoutExtension)) {
    return withoutExtension;
  }
  if (withoutExtension.startsWith("apps/extension/")) {
    return path.resolve(repoRoot, withoutExtension);
  }
  return path.resolve(extensionRoot, withoutExtension);
}

function resolveInputPath(value) {
  if (path.isAbsolute(value)) {
    return value;
  }
  if (value.startsWith("apps/extension/")) {
    return path.resolve(repoRoot, value);
  }
  return path.resolve(extensionRoot, value);
}

async function fetchStaticHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Margin fixture capture (https://github.com/withmargin/margin-read)"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function captureRenderedHtml(url, options) {
  if (typeof WebSocket === "undefined") {
    throw new Error("Rendered capture requires a Node.js runtime with a global WebSocket implementation.");
  }
  const endpoint = normalizeCdpEndpoint(options.cdpEndpoint);
  const target = await openCdpTarget(endpoint);
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    const loadEvent = client.waitForEvent("Page.loadEventFired", 30_000).catch(() => undefined);
    await client.send("Page.navigate", { url });
    await loadEvent;
    await waitForExpression(client, "document.readyState === 'complete' || document.readyState === 'interactive'", 15_000);
    if (options.waitSelector) {
      await waitForExpression(client, `Boolean(document.querySelector(${JSON.stringify(options.waitSelector)}))`, 15_000);
    }
    if (options.waitMs > 0) {
      await delay(options.waitMs);
    }
    const result = await client.send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML",
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(`Failed to evaluate page HTML: ${result.exceptionDetails.text ?? "unknown exception"}`);
    }
    const value = result.result?.value;
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Rendered page returned empty HTML.");
    }
    return value;
  } finally {
    client.close();
    await closeCdpTarget(endpoint, target.id);
  }
}

function normalizeCdpEndpoint(value) {
  return value.replace(/\/+$/u, "");
}

async function openCdpTarget(endpoint) {
  const response = await fetch(`${endpoint}/json/new?about%3Ablank`, { method: "PUT" });
  if (!response.ok) {
    throw new Error(`Failed to create Chrome DevTools target: ${response.status} ${response.statusText}`);
  }
  const target = await response.json();
  if (!target.id || !target.webSocketDebuggerUrl) {
    throw new Error("Chrome DevTools target response did not include id and webSocketDebuggerUrl.");
  }
  return target;
}

async function closeCdpTarget(endpoint, targetId) {
  try {
    await fetch(`${endpoint}/json/close/${targetId}`);
  } catch {
    // Best effort cleanup only.
  }
}

async function waitForExpression(client, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true
    });
    if (result.result?.value === true) {
      return;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for page condition: ${expression}`);
}

function parseWaitMs(value) {
  if (value === undefined) {
    return 2_000;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 60_000) {
    throw new Error("--wait-ms must be an integer between 0 and 60000.");
  }
  return parsed;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event);
    });
    this.socket.addEventListener("close", () => {
      this.rejectAll(new Error("Chrome DevTools WebSocket closed."));
    });
    this.socket.addEventListener("error", () => {
      this.rejectAll(new Error("Chrome DevTools WebSocket failed."));
    });
  }

  static connect(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener("open", () => {
        resolve(new CdpClient(socket));
      });
      socket.addEventListener("error", () => {
        reject(new Error("Could not connect to Chrome DevTools WebSocket."));
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  waitForEvent(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push((params) => {
        clearTimeout(timeout);
        resolve(params);
      });
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    this.socket.close();
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
      } else {
        pending.resolve(message.result ?? {});
      }
      return;
    }
    if (message.method) {
      const waiters = this.eventWaiters.get(message.method);
      if (!waiters?.length) {
        return;
      }
      this.eventWaiters.delete(message.method);
      for (const waiter of waiters) {
        waiter(message.params ?? {});
      }
    }
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
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
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<div\b[^>]*class=(["'])[^"']*\bmargin-translation\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, "");
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function stripVolatileAttributes(html) {
  return html
    .replace(/\sdata-margin-[a-z0-9-]+=(?:"[^"]*"|'[^']*')/gi, "")
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
