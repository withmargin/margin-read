import { describe, expect, it } from "vitest";
import { BLOCK_CANDIDATE_THRESHOLDS, createBlockCandidate } from "./blockCandidates";

describe("createBlockCandidate", () => {
  it("scores article paragraphs as high-value reading content", () => {
    const document = createDocument(`
      <main>
        <p>This paragraph has enough readable text to be treated as primary article content.</p>
      </main>
    `);
    const element = document.querySelector("p");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("paragraph");
    expect(candidate.source).toBe("semantic");
    expect(candidate.score).toBeGreaterThanOrEqual(BLOCK_CANDIDATE_THRESHOLDS.highPriorityScore);
    expect(candidate.priority).toBe(1);
    expect(candidate.skipReason).toBeUndefined();
  });

  it("keeps short headings eligible as structural reading content", () => {
    const document = createDocument("<main><h2>Quick start</h2></main>");
    const element = document.querySelector("h2");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("heading");
    expect(candidate.priority).toBe(0);
    expect(candidate.skipReason).toBeUndefined();
  });

  it("keeps headings in main content in the highest priority tier", () => {
    const document = createDocument("<main><h1>Agent view</h1></main>");
    const element = document.querySelector("h1");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("heading");
    expect(candidate.score).toBeGreaterThanOrEqual(BLOCK_CANDIDATE_THRESHOLDS.highPriorityScore);
    expect(candidate.priority).toBe(0);
  });

  it("classifies definition list entries as documentation content", () => {
    const document = createDocument("<main><dl><dt>Hooks</dt><dd>Commands that run at selected lifecycle events.</dd></dl></main>");
    const term = document.querySelector("dt");
    const description = document.querySelector("dd");

    expect(term).not.toBeNull();
    expect(description).not.toBeNull();
    expect(createBlockCandidate(term as HTMLElement, "semantic").role).toBe("definition");
    expect(createBlockCandidate(description as HTMLElement, "semantic").role).toBe("definition");
  });

  it("keeps definition terms inline while descriptions remain integrated", () => {
    const document = createDocument("<main><dl><dt>Hooks</dt><dd>Commands that run at selected lifecycle events.</dd></dl></main>");
    const term = document.querySelector("dt");
    const description = document.querySelector("dd");

    expect(term).not.toBeNull();
    expect(description).not.toBeNull();
    expect(createBlockCandidate(term as HTMLElement, "semantic").renderStrategy).toBe("inline");
    expect(createBlockCandidate(description as HTMLElement, "semantic").renderStrategy).toBe("integrated");
  });

  it("treats figcaption as an explicit low-value caption role", () => {
    const document = createDocument(`
      <main>
        <figure>
          <img alt="Chart" src="chart.png" />
          <figcaption>This image caption explains the chart but should not interrupt the main reading flow.</figcaption>
        </figure>
      </main>
    `);
    const element = document.querySelector("figcaption");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("caption");
    expect(candidate.skipReason).toBe("decorative-caption");
  });

  it("ranks short list items in main content as medium priority", () => {
    const document = createDocument("<main><ul><li>Compact setup notes</li></ul></main>");
    const element = document.querySelector("li");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("list");
    expect(candidate.score).toBeGreaterThanOrEqual(BLOCK_CANDIDATE_THRESHOLDS.mediumPriorityScore);
    expect(candidate.score).toBeLessThan(BLOCK_CANDIDATE_THRESHOLDS.highPriorityScore);
    expect(candidate.priority).toBe(2);
    expect(candidate.skipReason).toBeUndefined();
  });

  it("marks navigation content with a skip reason", () => {
    const document = createDocument(`
      <nav>
        <p>This navigation item looks readable but belongs to page chrome.</p>
      </nav>
    `);
    const element = document.querySelector("p");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("navigation");
    expect(candidate.skipReason).toBe("page-chrome");
  });

  it("penalizes high-link-density content below the high-priority tier", () => {
    const document = createDocument(`
      <main>
        <p>
          <a href="/docs">Read the full documentation guide with every linked reference included here</a>
          short note
        </p>
      </main>
    `);
    const element = document.querySelector("p");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.role).toBe("paragraph");
    expect(candidate.score).toBeLessThan(BLOCK_CANDIDATE_THRESHOLDS.highPriorityScore);
    expect(candidate.priority).not.toBe(1);
  });

  it("marks accessibility-only content with a skip reason", () => {
    const document = createDocument(`
      <main>
        <blockquote class="sr-only" data-agent-docs-index="true">
          <p>This documentation index is available to tools but should not be translated for visual readers.</p>
        </blockquote>
      </main>
    `);
    const element = document.querySelector("p");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "semantic");

    expect(candidate.skipReason).toBe("hidden-content");
  });

  it("prefers table-cell rendering for table content", () => {
    const document = createDocument(`
      <table>
        <tbody>
          <tr>
            <td>Re-injected from disk after compaction happens.</td>
          </tr>
        </tbody>
      </table>
    `);
    const element = document.querySelector("td");

    expect(element).not.toBeNull();
    const candidate = createBlockCandidate(element as HTMLElement, "legacy");

    expect(candidate.role).toBe("table");
    expect(candidate.renderStrategy).toBe("table-cell");
  });
});

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("test");
  document.body.innerHTML = html;
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    Object.defineProperty(element, "innerText", {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? "";
      }
    });
  }
  return document;
}
