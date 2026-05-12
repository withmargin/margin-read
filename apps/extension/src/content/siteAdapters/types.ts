import type { TextBlockOptions } from "../textBlocks";

export interface SiteAdapter {
  readonly id: string;
  matches(document: Document, options: TextBlockOptions): boolean;
  collectBlocks(document: Document, options: TextBlockOptions): HTMLElement[];
}
