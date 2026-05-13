# Site Adapter Policy

Margin Read uses a cascading extraction model:

1. Site adapters for highly specific surfaces.
2. Content archetypes for reusable DOM output patterns.
3. Universal semantic extraction for normal HTML reading content.
4. Legacy fallback for old or sparse pages.

Site adapters are the most expensive layer to maintain. Add one only when the lower layers cannot preserve the reading experience.

## Acceptance Criteria

A new site adapter must satisfy all criteria below.

### Structural Specificity

The site has a DOM or interaction model that universal extraction and content archetypes cannot handle reliably.

Examples:

- X posts and longform articles, where useful content is embedded in platform-specific cards.
- YouTube captions, where the source is timed media text rather than normal page paragraphs.

Do not add a site adapter only because a site could be slightly better with custom selectors.

## Non-Adapter Examples

The cases below should not become site adapters.

- A news site whose article layout is normal semantic HTML with custom class names. Improve the article archetype or universal scoring instead.
- A blog or docs platform that renders Markdown inside common containers such as `.prose`, `.markdown-body`, or `.theme-doc-markdown`. Treat it as a content archetype.
- A page where universal extraction misses one decorative or low-value element. Adjust filtering, scoring, or role handling before adding a site override.
- A site that only needs cosmetic layout tweaks after extraction. Fix the rendering strategy instead of creating an adapter.
- A site with unstable generated class names but no stable DOM, ARIA, or data attributes. Do not add a brittle adapter without a reliable selector axis.

### Audience Value

The site is common in Margin Read users' reading workflows, or it is strategically important for the product.

Useful signals:

- Frequently reported by users.
- High-volume reading surface.
- Important developer, research, social, video, or publishing platform.

### Regression Coverage

Every adapter must ship with fixture coverage before it is enabled broadly.

Required fixtures:

- A representative HTML snapshot or stable reduced DOM.
- Expected included text.
- Expected excluded chrome or decorative text.
- At least one `blockShape` assertion for source, role, and rendering strategy.

### Maintenance Boundaries

Adapters are maintained as long as they keep solving a problem that lower layers cannot solve.

Retire or simplify an adapter when:

- A content archetype can cover at least 80% of the same useful blocks.
- The platform DOM becomes standard enough for universal extraction.
- The adapter repeatedly breaks and no longer has enough user value to justify its maintenance cost.

### Privacy

Adapters must not introduce telemetry, remote DOM capture, or background crawling.

Fixtures should be reduced snapshots with no personal data. If a real page is captured for debugging, strip user-specific identifiers before committing it.

## Implementation Rules

- Keep site code under `apps/extension/src/content/siteAdapters/`.
- Keep adapter fixtures under `apps/extension/test/fixtures/extraction/site/<site>/`.
- Prefer DOM structure, ARIA roles, and stable data attributes over generated class names.
- Keep adapter output compatible with `BlockCandidate` scoring and rendering metadata.
- Do not bypass the shared visibility, accessibility-only, translated-state, and interactive-content filters.
