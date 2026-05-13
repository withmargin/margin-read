import { describe, expect, it } from "vitest";
import { detectDocsArchetypeConfidence, DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD } from "./docs";

describe("detectDocsArchetypeConfidence", () => {
  it("recognizes Mintlify-style docs with data-as blocks inside main content", () => {
    const document = createDocument(`
      <main>
        <span data-as="p">The session walks through a realistic flow with representative token counts.</span>
        <span data-as="p">Each turn appends new messages, tool results, and assistant output.</span>
        <span data-as="p">When usage crosses the threshold, compaction summarizes the oldest state.</span>
      </main>
    `);

    expect(detectDocsArchetypeConfidence(document)).toBeGreaterThanOrEqual(DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("recognizes Docusaurus-style docs with markdown containers", () => {
    const document = createDocument(`
      <main>
        <aside>Docs navigation</aside>
        <div class="theme-doc-markdown">
          <h1>Context windows</h1>
          <p>Context windows define the active working set for a session.</p>
          <pre><code>claude --help</code></pre>
        </div>
      </main>
    `);

    expect(detectDocsArchetypeConfidence(document)).toBeGreaterThanOrEqual(DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("does not classify normal article pages as docs", () => {
    const document = createDocument(`
      <article>
        <h1>Why margins matter</h1>
        <p>Readers have always used the margin as a place for notes, translation, and attention.</p>
        <p>This article uses normal semantic HTML rather than a docs markdown shell.</p>
      </article>
    `);

    expect(detectDocsArchetypeConfidence(document)).toBeLessThan(DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("does not classify isolated data-as components as docs", () => {
    const document = createDocument(`
      <section>
        <span data-as="p">Single data-as paragraph not enough.</span>
      </section>
    `);

    expect(detectDocsArchetypeConfidence(document)).toBeLessThan(DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("requires structure signals beyond repeated data-as blocks", () => {
    const document = createDocument(`
      <section>
        <span data-as="p">First component paragraph.</span>
        <span data-as="p">Second component paragraph.</span>
        <span data-as="p">Third component paragraph.</span>
      </section>
    `);

    expect(detectDocsArchetypeConfidence(document)).toBeLessThan(DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });
});

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("docs-archetype");
  document.body.innerHTML = html;
  return document;
}
