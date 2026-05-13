import { describe, expect, it } from "vitest";
import { ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD, detectArticleArchetypeConfidence } from "./article";

describe("detectArticleArchetypeConfidence", () => {
  it("recognizes publication article bodies", () => {
    const document = createDocument(`
      <main>
        <div class="entry-content">
          <h1>Maintenance is what keeps everything going.</h1>
          <p>Every living thing spends time maintaining its own life and the systems it depends on.</p>
          <p>Plants tend the life of the soil they grow in, and people tend homes and tools.</p>
        </div>
      </main>
    `);

    expect(detectArticleArchetypeConfidence(document)).toBeGreaterThanOrEqual(ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("does not classify ordinary semantic articles as an archetype", () => {
    const document = createDocument(`
      <article>
        <h1>Notes on reading software</h1>
        <p>Normal semantic article pages should remain covered by universal extraction.</p>
        <p>This keeps the archetype from stealing attribution when it has no special structure.</p>
      </article>
    `);

    expect(detectArticleArchetypeConfidence(document)).toBeLessThan(ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });

  it("does not classify a sparse article-content widget", () => {
    const document = createDocument(`
      <section class="article-content">
        <p>One short card is not enough structure.</p>
      </section>
    `);

    expect(detectArticleArchetypeConfidence(document)).toBeLessThan(ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD);
  });
});

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("article-archetype");
  document.body.innerHTML = html;
  return document;
}
