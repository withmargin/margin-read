import type { TextBlockOptions } from "../textBlocks";
import { xAdapter } from "./x";
import type { SiteAdapter } from "./types";

export type { SiteAdapter } from "./types";

export const siteAdapters: readonly SiteAdapter[] = [xAdapter];

export function collectSiteAdapterBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  for (const adapter of siteAdapters) {
    if (!adapter.matches(document, options)) {
      continue;
    }
    const blocks = adapter.collectBlocks(document, options);
    if (blocks.length > 0) {
      return blocks;
    }
  }
  return [];
}
