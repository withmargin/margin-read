import type { TextBlockOptions } from "../textBlocks";
import { xAdapter } from "./x";
import type { SiteAdapter } from "./types";

export type { SiteAdapter } from "./types";

export const siteAdapters: readonly SiteAdapter[] = [xAdapter];

export interface SiteAdapterResult {
  // True when an adapter claimed the page, even if it currently yields no blocks
  // (e.g. everything is already translated). The universal extractor must not run
  // for a claimed page — doing so re-splits adapter-owned content and double-translates it.
  matched: boolean;
  blocks: HTMLElement[];
}

export function collectSiteAdapterBlocks(document: Document, options: TextBlockOptions): SiteAdapterResult {
  let matched = false;
  for (const adapter of siteAdapters) {
    if (!adapter.matches(document, options)) {
      continue;
    }
    matched = true;
    const blocks = adapter.collectBlocks(document, options);
    if (blocks.length > 0) {
      return { matched, blocks };
    }
  }
  return { matched, blocks: [] };
}
