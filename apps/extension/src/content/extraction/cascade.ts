import type { BlockCandidate } from "../blockCandidates";
import { collectArticleBlocks } from "./archetypes/article";
import { collectDocsBlocks } from "./archetypes/docs";
import { collectLegacyBlocks } from "./legacy";
import { createIncludedBlockCandidates, getNormalizedText, removeCoveredAncestorCandidates } from "./shared";
import type { TextBlockOptions } from "./types";
import { collectUniversalBlocks } from "./universal";

const MIN_SEMANTIC_BLOCKS = 3;
const MIN_SEMANTIC_TEXT_LENGTH = 500;

export function collectBlockCandidates(document: Document, options: TextBlockOptions): BlockCandidate[] {
  const docsBlocks = collectDocsBlocks(document, options);
  const articleBlocks = collectArticleBlocks(document, options);
  const universalBlocks = collectUniversalBlocks(document, options);
  const archetypeBlocks = uniqueElements([...docsBlocks, ...articleBlocks]);
  const semanticBlocks = uniqueElements([...archetypeBlocks, ...universalBlocks]);
  if (hasEnoughSemanticContent(archetypeBlocks) || hasEnoughSemanticContent(semanticBlocks)) {
    return createSemanticBlockCandidates(archetypeBlocks, universalBlocks);
  }

  const legacyBlocks = collectLegacyBlocks(document, options);
  return legacyBlocks.length > 0
    ? createIncludedBlockCandidates(legacyBlocks, "legacy")
    : createSemanticBlockCandidates(archetypeBlocks, universalBlocks);
}

function hasEnoughSemanticContent(blocks: HTMLElement[]): boolean {
  if (blocks.length >= MIN_SEMANTIC_BLOCKS) {
    return true;
  }

  if (blocks.length >= 2 && blocks.some((block) => block.matches("dt, dd, th, td"))) {
    return true;
  }

  const totalLength = blocks.reduce((length, block) => length + getNormalizedText(block).length, 0);
  return totalLength >= MIN_SEMANTIC_TEXT_LENGTH;
}

function uniqueElements(elements: HTMLElement[]): HTMLElement[] {
  return Array.from(new Set(elements));
}

function createSemanticBlockCandidates(
  archetypeBlocks: HTMLElement[],
  universalBlocks: HTMLElement[]
): BlockCandidate[] {
  const archetypeBlockSet = new Set(archetypeBlocks);
  const remainingUniversalBlocks = universalBlocks.filter((element) => !archetypeBlockSet.has(element));

  return removeCoveredAncestorCandidates([
    ...createIncludedBlockCandidates(archetypeBlocks, "archetype"),
    ...createIncludedBlockCandidates(remainingUniversalBlocks, "semantic")
  ]);
}
