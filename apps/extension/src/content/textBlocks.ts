import { collectBlockCandidates } from "./extraction/cascade";
import { isTranslatableElement } from "./extraction/shared";
import type { TextBlockOptions } from "./extraction/types";

export type { TextBlockOptions } from "./extraction/types";
export { collectBlockCandidates } from "./extraction/cascade";
export { isTranslatableElement } from "./extraction/shared";

export function collectTextBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  return collectBlockCandidates(document, options).map((candidate) => candidate.element);
}
